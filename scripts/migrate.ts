/**
 * Apply pending database migrations, in order, and record what ran.
 *
 *   pnpm db:migrate              # apply everything pending
 *   pnpm db:migrate -- --status  # list applied and pending, change nothing
 *
 * Exists because the manual path silently skipped two files. `psql -f` works
 * fine and is still what actually executes each migration below — what it never
 * did was leave a record, so a file that was committed but never applied looked
 * exactly like one that had been. `schema_migrations` is that record, and this
 * script is its only writer.
 *
 * psql runs the SQL rather than the Neon HTTP driver because migrations are
 * multi-statement and contain `do $$ ... $$` blocks; the HTTP driver takes one
 * statement per call and would need the files split to be executed at all.
 *
 * Needs DATABASE_URL in the environment, like every other script here:
 *
 *   DATABASE_URL="postgres://..." pnpm db:migrate
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { db, databaseConfigured } from "@/lib/db";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

/** Filenames sort chronologically because every one is prefixed with a timestamp. */
function migrationsOnDisk(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => name.replace(/\.sql$/, ""))
    .sort();
}

/** Versions already recorded. Throws if the ledger is missing — bootstrap first. */
async function appliedVersions(): Promise<Set<string>> {
  const sql = db();
  const rows = await sql`select version from schema_migrations`;
  return new Set(rows.map((row) => row.version as string));
}

async function ledgerExists(): Promise<boolean> {
  const sql = db();
  const rows = await sql`select to_regclass('public.schema_migrations') as table_name`;
  return Boolean(rows[0]?.table_name);
}

/**
 * Creates the ledger before anything is compared against it.
 *
 * The ledger cannot record its own arrival, so its migration is applied out of
 * band here. That file also backfills every version that predates it, which is
 * what stops the first run on an existing database from re-applying the entire
 * history: without the backfill, an empty ledger is indistinguishable from a
 * fresh database, and the older migrations would all be replayed.
 */
async function bootstrapLedger(databaseUrl: string, onDisk: string[]): Promise<void> {
  if (await ledgerExists()) return;

  const version = onDisk.find((name) => name.endsWith("_schema_migrations"));
  if (!version) {
    throw new Error("no *_schema_migrations migration found to bootstrap the ledger");
  }

  console.log(`bootstrapping  ${version}`);
  applyOne(version, databaseUrl);
}

function applyOne(version: string, databaseUrl: string): number {
  const started = Date.now();
  const file = path.join(MIGRATIONS_DIR, `${version}.sql`);

  // ON_ERROR_STOP is what makes a failed statement a failed migration. Without
  // it psql reports the error, carries on to the next statement, and exits 0 —
  // which is how a half-applied file gets recorded as a success.
  const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-q", "-f", file], {
    stdio: ["ignore", "inherit", "inherit"],
    encoding: "utf8",
  });

  if (result.error) {
    throw new Error(`could not run psql: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${version} failed with exit code ${result.status}`);
  }

  return Date.now() - started;
}

async function main() {
  if (!databaseConfigured()) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL as string;
  const statusOnly = process.argv.includes("--status");

  const onDisk = migrationsOnDisk();
  await bootstrapLedger(databaseUrl, onDisk);
  const applied = await appliedVersions();
  const pending = onDisk.filter((version) => !applied.has(version));

  if (statusOnly) {
    for (const version of onDisk) {
      console.log(`${applied.has(version) ? "applied" : "PENDING"}  ${version}`);
    }
    // A version recorded as applied with no file on disk means the file was
    // deleted or renamed after the fact, which breaks the assumption that the
    // ledger describes this checkout.
    const orphaned = [...applied].filter((version) => !onDisk.includes(version));
    for (const version of orphaned) {
      console.log(`ORPHANED  ${version} (recorded as applied, no file on disk)`);
    }
    console.log(`\n${applied.size} applied, ${pending.length} pending`);
    return;
  }

  if (pending.length === 0) {
    console.log("nothing to apply");
    return;
  }

  const sql = db();
  for (const version of pending) {
    console.log(`applying  ${version}`);
    const durationMs = applyOne(version, databaseUrl);

    // Recorded after the file succeeds, never before: a crash mid-migration must
    // leave the version pending so the next run retries it, rather than marking
    // work done that only half happened.
    await sql`
      insert into schema_migrations (version, duration_ms)
      values (${version}, ${durationMs}::int)
      on conflict (version) do nothing
    `;
    console.log(`applied   ${version} (${durationMs}ms)`);
  }

  console.log(`\n${pending.length} migration(s) applied`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

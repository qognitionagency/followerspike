/**
 * The job queue.
 *
 * Postgres is the queue. `claimDue` leans on `for update skip locked`, which is
 * what lets several runners poll the same table concurrently and still have
 * each row handed to exactly one of them. The Neon HTTP driver has no
 * transactions, so every state change below is a single statement — the CTEs
 * are not stylistic, they are how atomicity is obtained without a `begin`.
 *
 * Failure handling is deliberately pessimistic. `attempts` increments when a
 * job is *claimed*, not when it fails, so a job that crashes its runner hard
 * enough to prevent any reporting still exhausts its retries instead of
 * looping forever. Anything claimed but never reported is picked back up by
 * `reapExpiredLeases`.
 *
 * Also home to the QStash transport, because both routes that speak to QStash
 * — the dispatcher and the runner — need the same verifier, and one shared
 * implementation of a signature check is worth more than a tidier module split.
 */
import { Client, Receiver } from "@upstash/qstash";
import { db, databaseConfigured } from "@/lib/db";
import { appUrl, optionalEnv } from "@/lib/env";

export type JobStatus = "pending" | "claimed" | "succeeded" | "failed" | "dead";

/** Mirrors `jobs` in db/migrations/20260821130000_jobs.sql. Timestamps are serialized, as everywhere else. */
export type Job = {
  id: string;
  workspace_id: string | null;
  kind: string;
  payload: Record<string, unknown>;
  run_at: string;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  lease_expires_at: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
};

export type EnqueueInput = {
  kind: string;
  payload?: Record<string, unknown>;
  /** Defaults to now. Accepts a Date or an ISO string. */
  runAt?: Date | string;
  /** Present makes the enqueue idempotent; absent means the work may legitimately repeat. */
  idempotencyKey?: string;
  workspaceId?: string | null;
  maxAttempts?: number;
};

/**
 * How long a claimed job may run before the reaper assumes its runner died.
 * Comfortably longer than the platform function timeout, so a job that is
 * merely slow is never handed to a second runner while the first is still on it.
 */
const LEASE_SECONDS = 15 * 60;

/** First retry lands ~30s out, then 1m, 2m, 4m… capped so a dying provider is retried hourly, not never. */
const BASE_BACKOFF_SECONDS = 30;
const MAX_BACKOFF_SECONDS = 60 * 60;

/** Postgres text columns take the whole message otherwise; the tail is never the useful part. */
const MAX_ERROR_LENGTH = 2000;

function toIso(value: Date | string | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function truncateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}

/**
 * Writes a job down. Returns null when the row already existed under the same
 * idempotency key — a duplicate enqueue is a success, not an error, which is
 * the entire point of the key.
 */
export async function enqueue(input: EnqueueInput): Promise<Job | null> {
  if (!databaseConfigured()) return null;

  const sql = db();
  // coalesce rather than passing null: a null would override the column
  // default instead of falling back to it, and both columns are NOT NULL.
  const rows = (await sql`
    insert into jobs (workspace_id, kind, payload, run_at, idempotency_key, max_attempts)
    values (
      ${input.workspaceId ?? null},
      ${input.kind},
      ${JSON.stringify(input.payload ?? {})}::jsonb,
      coalesce(${toIso(input.runAt)}::timestamptz, now()),
      ${input.idempotencyKey ?? null},
      coalesce(${input.maxAttempts ?? null}::int, 5)
    )
    on conflict (idempotency_key) do nothing
    returning *
  `) as Job[];

  return rows[0] ?? null;
}

/**
 * Takes up to `limit` due jobs and leases them.
 *
 * `skip locked` means a second dispatcher running at the same instant walks
 * past the rows this one is taking rather than blocking on them, so overlapping
 * cron ticks produce no duplicate work and no contention.
 */
export async function claimDue(limit = 25): Promise<Job[]> {
  if (!databaseConfigured()) return [];

  const sql = db();
  return (await sql`
    with due as (
      select id
      from jobs
      where status = 'pending' and run_at <= now()
      order by run_at asc
      limit ${limit}::int
      for update skip locked
    )
    update jobs j
    set
      status = 'claimed',
      attempts = j.attempts + 1,
      lease_expires_at = now() + make_interval(secs => ${LEASE_SECONDS}::float8),
      updated_at = now()
    from due
    where j.id = due.id
    returning j.*
  `) as Job[];
}

/** One job by id, for the runner route resolving a QStash message back to its row. */
export async function getJob(jobId: string): Promise<Job | null> {
  if (!databaseConfigured()) return null;
  const sql = db();
  const rows = (await sql`select * from jobs where id = ${jobId} limit 1`) as Job[];
  return rows[0] ?? null;
}

/** Terminal success. Clears the lease and the last error so a retried job's history does not mislead. */
/**
 * Puts a claimed job back on the queue without spending an attempt.
 *
 * For work that was never tried rather than work that failed — the global pause
 * being on, a quiet hour, a cap already reached. `claimDue` increments attempts
 * when it hands the job out, so this gives that attempt back; otherwise a long
 * pause would quietly burn a job's retries and bury it in `dead` having never
 * run once.
 */
export async function defer(jobId: string, seconds: number): Promise<void> {
  if (!databaseConfigured()) return;
  const sql = db();
  await sql`
    update jobs
    set
      status = 'pending',
      attempts = greatest(attempts - 1, 0),
      lease_expires_at = null,
      run_at = now() + make_interval(secs => ${seconds}::float8),
      updated_at = now()
    where id = ${jobId}
  `;
}

export async function complete(jobId: string): Promise<void> {
  if (!databaseConfigured()) return;
  const sql = db();
  await sql`
    update jobs
    set status = 'succeeded', lease_expires_at = null, last_error = null, updated_at = now()
    where id = ${jobId}
  `;
}

export type FailOptions = {
  /**
   * The failure is not worth retrying — a malformed payload, a revoked token,
   * a deleted post. Parks the job in `failed` immediately rather than burning
   * four more attempts on an outcome that cannot change.
   */
  permanent?: boolean;
};

/**
 * Records a failed attempt and schedules the retry.
 *
 * `attempts` was already incremented at claim time, so it counts this attempt:
 * once it reaches `max_attempts` there is nothing left to schedule and the job
 * goes to `dead`, where it stays until a human looks at it.
 */
export async function fail(jobId: string, error: unknown, options: FailOptions = {}): Promise<void> {
  if (!databaseConfigured()) return;

  const sql = db();
  await sql`
    update jobs
    set
      status = case
        when ${options.permanent ?? false}::boolean then 'failed'
        when attempts >= max_attempts then 'dead'
        else 'pending'
      end,
      run_at = case
        when ${options.permanent ?? false}::boolean or attempts >= max_attempts then run_at
        else now() + make_interval(secs => least(
          ${MAX_BACKOFF_SECONDS}::float8,
          ${BASE_BACKOFF_SECONDS}::float8 * power(2, greatest(attempts - 1, 0))
        ))
      end,
      last_error = ${truncateError(error)},
      lease_expires_at = null,
      updated_at = now()
    where id = ${jobId}
  `;
}

/**
 * Returns jobs whose runner never reported back to the pool.
 *
 * This is the only thing standing between a killed function and a scheduled
 * post that silently never publishes, so the dispatcher runs it every tick.
 * Rows already out of attempts go straight to `dead` rather than being handed
 * to yet another runner that will be killed the same way.
 */
export async function reapExpiredLeases(): Promise<number> {
  if (!databaseConfigured()) return 0;

  const sql = db();
  const rows = (await sql`
    update jobs
    set
      status = case when attempts >= max_attempts then 'dead' else 'pending' end,
      last_error = 'Lease expired before the runner reported an outcome',
      lease_expires_at = null,
      updated_at = now()
    where status = 'claimed'
      and lease_expires_at is not null
      and lease_expires_at < now()
    returning id
  `) as { id: string }[];

  return rows.length;
}

// ---------------------------------------------------------------------------
// QStash transport
// ---------------------------------------------------------------------------

/** Where a fanned-out job message is delivered. */
export const JOB_RUN_PATH = "/api/jobs/run";

/**
 * True when there is a QStash account to publish through. False locally, where
 * the dispatcher runs claimed jobs inline instead — note this says nothing
 * about *verification*, which is never optional in either mode.
 */
export function qstashPublishConfigured(): boolean {
  return Boolean(optionalEnv("QSTASH_TOKEN"));
}

let receiver: Receiver | null = null;

/**
 * Verifies an inbound QStash signature against the raw request body.
 *
 * Fails closed in every direction: a missing header, an absent signing key, a
 * body that does not match, or an expired message all return false, and the
 * caller answers 401. Note that a deployment with no signing keys configured
 * can therefore never be driven over HTTP at all — that is intended, since the
 * alternative is a publicly executable job runner. Local development drives the
 * queue through `pnpm jobs:tick` instead, which needs neither.
 *
 * The URL is deliberately not checked. QStash signs the destination it was
 * given, which is the public app URL; behind Vercel's proxy the URL the handler
 * reconstructs does not reliably match it, and a mismatch there would reject
 * every real message. The body, the expiry and the signing key still bind the
 * message to us.
 */
export async function verifyQStashSignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;

  const currentSigningKey = optionalEnv("QSTASH_CURRENT_SIGNING_KEY");
  const nextSigningKey = optionalEnv("QSTASH_NEXT_SIGNING_KEY");
  if (!currentSigningKey && !nextSigningKey) return false;

  if (!receiver) {
    receiver = new Receiver({
      currentSigningKey: currentSigningKey || undefined,
      nextSigningKey: nextSigningKey || undefined,
      // Pinned off rather than left to the QSTASH_DEV environment variable.
      // Dev mode swaps in the QStash dev server's signing keys, which are
      // published, so a stray env var would otherwise turn this endpoint into
      // one anybody can sign for. Local development uses `pnpm jobs:tick`.
      devMode: false,
    });
  }

  try {
    // Throws SignatureError rather than returning false on a bad signature.
    return await receiver.verify({ signature, body: rawBody });
  } catch {
    return false;
  }
}

/**
 * Hands one claimed job to QStash as its own signed message.
 *
 * One message per job rather than one per batch: a single invocation that had
 * to run every due job would eventually meet the function timeout, and the jobs
 * that had not run yet would die with it. QStash also retries a message whose
 * delivery failed, which is a second net under the lease reaper.
 */
export async function publishJobMessage(job: Job): Promise<void> {
  const client = new Client({ token: optionalEnv("QSTASH_TOKEN") });
  await client.publishJSON({
    url: `${appUrl()}${JOB_RUN_PATH}`,
    body: { jobId: job.id },
    // Keyed on the attempt, not on the job. QStash remembers a deduplication id
    // for ninety days, so a bare job id would make the second attempt of any
    // retried job silently vanish — accepted and never enqueued.
    deduplicationId: `job:${job.id}:${job.attempts}`,
    retries: 2,
  });
}

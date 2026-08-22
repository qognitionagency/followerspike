/**
 * Error recording.
 *
 * There was none. Every API route caught its exception, answered a generic 502
 * and dropped the detail on the floor, so the only trace a request had failed
 * was the status code the caller saw — nothing to grep, nothing to count, no
 * way to tell one failing dependency from another.
 *
 * This writes to Postgres for the same reason the rate limiter does: Neon is
 * the one dependency production actually has, and `automation_log` already
 * established the pattern. Swap the body of `recordError` for a Sentry client
 * later if you want alerting; every call site is already in the right place.
 */
import { db, databaseConfigured } from "@/lib/db";

export type ErrorContext = {
  /** Coarse origin: "api/ai/post", "job/publish_variant". What you group by. */
  source: string;
  /** Overrides error.name. Use it for handled failures that are not exceptions. */
  kind?: string;
  userId?: string | null;
  workspaceId?: string | null;
  requestPath?: string | null;
  /** Status codes, job ids, platform names. Never a request body. */
  context?: Record<string, unknown>;
};

/** Pulls a name and message off anything that reaches a catch block. */
function describe(error: unknown): { kind: string; message: string; stack: string | null } {
  if (error instanceof Error) {
    return { kind: error.name || "Error", message: error.message, stack: error.stack ?? null };
  }
  return { kind: "NonError", message: String(error), stack: null };
}

/**
 * Records one failure. Never throws.
 *
 * A logger that can fail the request it is reporting on is worse than no
 * logger, so every path here is guarded: this is called from catch blocks, and
 * several of them are already handling the database being unreachable.
 */
export async function recordError(error: unknown, context: ErrorContext): Promise<void> {
  const { kind, message, stack } = describe(error);

  // Always reaches stdout. On Vercel that is the runtime log, which is the only
  // record that survives the database itself being the thing that failed.
  console.error(`[${context.source}] ${context.kind ?? kind}: ${message}`);

  if (!databaseConfigured()) return;

  try {
    const sql = db();
    await sql`
      insert into error_log (source, kind, message, stack, user_id, workspace_id, request_path, context)
      values (
        ${context.source},
        ${context.kind ?? kind},
        ${message.slice(0, 4000)},
        ${stack ? stack.slice(0, 8000) : null},
        ${context.userId ?? null},
        ${context.workspaceId ?? null},
        ${context.requestPath ?? null},
        ${JSON.stringify(context.context ?? {})}::jsonb
      )
    `;
  } catch {
    // Deliberately silent. The console.error above already happened, and
    // throwing here would replace a handled failure with an unhandled one.
  }
}

export type ErrorLogEntry = {
  id: string;
  occurred_at: string;
  source: string;
  kind: string;
  message: string;
  request_path: string | null;
  context: Record<string, unknown>;
};

/** The admin console's view. Newest first. */
export async function recentErrors(limit = 100): Promise<ErrorLogEntry[]> {
  if (!databaseConfigured()) return [];
  const sql = db();
  return (await sql`
    select id, occurred_at, source, kind, message, request_path, context
    from error_log
    order by occurred_at desc
    limit ${limit}
  `) as unknown as ErrorLogEntry[];
}

/** Errors per source over a recent window, for "what is failing most right now". */
export async function errorCountsBySource(hours = 24): Promise<Array<{ source: string; count: number }>> {
  if (!databaseConfigured()) return [];
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const sql = db();
  const rows = await sql`
    select source, count(*)::int as count
    from error_log
    where occurred_at >= ${cutoff.toISOString()}
    group by source
    order by count desc
  `;
  return rows.map((row) => ({ source: row.source as string, count: Number(row.count) }));
}

/**
 * Drops entries past their useful life. Called from the dispatcher tick.
 * 30 days is long enough to investigate a recurring failure and short enough
 * that the table never becomes something you have to think about.
 */
export async function pruneErrorLog(olderThanDays = 30): Promise<number> {
  if (!databaseConfigured()) return 0;
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const sql = db();
  const rows = await sql`delete from error_log where occurred_at < ${cutoff.toISOString()} returning id`;
  return rows.length;
}

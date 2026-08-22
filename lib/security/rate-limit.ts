/**
 * Fixed-window rate limiting, counted in Postgres.
 *
 * The endpoint this exists for is `/api/free-tools/[slug]`: unauthenticated, an
 * AI generation per call, and a lead row written from an unverified email. It
 * had no limit at all, so the cost ceiling was whatever a loop could reach.
 *
 * Fixed window rather than sliding because the whole limiter has to be one
 * statement to be correct under concurrency. Requests inside the same window
 * collide on the primary key and increment the same counter, so the count is
 * accurate without a transaction or a lock. The cost is the usual fixed-window
 * edge: a caller can spend a full allowance at the end of one window and again
 * at the start of the next. For abuse and cost control that is fine — it bounds
 * the rate to twice the limit in the worst case, and nothing here is a security
 * boundary that needs better than that.
 */
import { db, databaseConfigured } from "@/lib/db";
import { recordError } from "@/lib/observability/log";

export type RateLimitRule = {
  /**
   * Who is being limited and for what. Include the scope, not just the caller:
   * `free-tool:spike-rank-x:1.2.3.4` so one tool cannot spend another's budget.
   */
  bucket: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** When the current window ends and the allowance resets. */
  resetAt: Date;
  /** Seconds until reset. Goes straight into a Retry-After header. */
  retryAfterSeconds: number;
};

/**
 * Counts one request against a bucket and reports whether it may proceed.
 *
 * Fails open. A database that is unreachable or absent should not take the
 * public free tools down with it — several of them (Bluesky Spike Rank, the
 * thread splitter) cost nothing to serve and work fine without Neon. The
 * failure is recorded rather than swallowed, so an outage that quietly disabled
 * every limit is visible instead of invisible.
 */
export async function checkRateLimit(rule: RateLimitRule): Promise<RateLimitResult> {
  const windowMs = rule.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const resetAt = new Date(windowStart.getTime() + windowMs);
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));

  const allow = (used: number): RateLimitResult => ({
    allowed: used <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - used),
    resetAt,
    retryAfterSeconds,
  });

  if (!databaseConfigured()) return allow(0);

  try {
    const sql = db();
    const rows = await sql`
      insert into rate_limits (bucket, window_start, request_count)
      values (${rule.bucket}, ${windowStart.toISOString()}, 1)
      on conflict (bucket, window_start)
      do update set request_count = rate_limits.request_count + 1
      returning request_count
    `;
    return allow(Number(rows[0]?.request_count ?? 1));
  } catch (error) {
    await recordError(error, {
      source: "rate-limit",
      kind: "rate_limit_unavailable",
      context: { bucket: rule.bucket },
    });
    return allow(0);
  }
}

/**
 * The caller's IP, as the proxy reported it.
 *
 * `x-forwarded-for` is a client-to-proxy chain and the leftmost entry is the
 * only one the client did not choose, but it is also the one the client can
 * forge when the request does not pass a trusted proxy. On Vercel it does, and
 * Vercel overwrites the header, so the leftmost entry is trustworthy there.
 * Locally there is no proxy and no header, which is why this falls back to a
 * shared bucket rather than to something forgeable: an unidentifiable caller
 * gets a shared allowance instead of an unlimited one.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Standard headers so a client can back off on its own instead of retrying blind. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(result.retryAfterSeconds),
  };
  if (!result.allowed) headers["Retry-After"] = String(result.retryAfterSeconds);
  return headers;
}

/**
 * Drops windows that have already expired.
 *
 * Called from the dispatcher tick rather than on the request path: pruning
 * inside `checkRateLimit` would add a delete to every request to save a table
 * that grows by a few rows an hour.
 */
export async function pruneRateLimits(olderThanHours = 24): Promise<number> {
  if (!databaseConfigured()) return 0;
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  const sql = db();
  const rows = await sql`
    delete from rate_limits where window_start < ${cutoff.toISOString()} returning bucket
  `;
  return rows.length;
}

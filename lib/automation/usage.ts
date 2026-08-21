import { db, databaseConfigured } from "@/lib/db";
import type { AutomationOutcome } from "@/lib/types/db";

/**
 * Counting what automation actually did, and reacting when it keeps failing.
 *
 * `user_daily_usage` has existed since the v2 migration and nothing has ever
 * incremented it — the dashboard renders permanent zeros. These are the writers.
 */

/** Columns on `user_daily_usage` that a run can consume. */
export type UsageField = "posts" | "comments" | "dms" | "ai_calls" | "invites" | "likes";

/**
 * Auto-pause threshold. Low on purpose: repeated failures usually mean a
 * revoked token or a platform change, and continuing to hammer a provider under
 * a user's name is worse than stopping and telling them.
 */
export const CONSECUTIVE_ERROR_LIMIT = 5;

/**
 * Adds to today's tally.
 *
 * A single statement, never read-modify-write: two publishes finishing at once
 * must not both read 4 and write 5. The composite primary key `(user_id,
 * usage_date)` is what makes the upsert safe under concurrency.
 */
export async function incrementUsage(
  userId: string,
  workspaceId: string | null,
  field: UsageField,
  by = 1
): Promise<void> {
  if (!databaseConfigured()) return;
  const sql = db();

  // The column is chosen from a closed union above, so the switch keeps the
  // identifier out of interpolation entirely — a tagged template parameterizes
  // values, and a column name is not a value.
  switch (field) {
    case "posts":
      await sql`
        insert into user_daily_usage (user_id, workspace_id, usage_date, posts)
        values (${userId}, ${workspaceId}, current_date, ${by}::int)
        on conflict (user_id, usage_date) do update set posts = user_daily_usage.posts + ${by}::int
      `;
      return;
    case "comments":
      await sql`
        insert into user_daily_usage (user_id, workspace_id, usage_date, comments)
        values (${userId}, ${workspaceId}, current_date, ${by}::int)
        on conflict (user_id, usage_date) do update set comments = user_daily_usage.comments + ${by}::int
      `;
      return;
    case "dms":
      await sql`
        insert into user_daily_usage (user_id, workspace_id, usage_date, dms)
        values (${userId}, ${workspaceId}, current_date, ${by}::int)
        on conflict (user_id, usage_date) do update set dms = user_daily_usage.dms + ${by}::int
      `;
      return;
    case "ai_calls":
      await sql`
        insert into user_daily_usage (user_id, workspace_id, usage_date, ai_calls)
        values (${userId}, ${workspaceId}, current_date, ${by}::int)
        on conflict (user_id, usage_date) do update set ai_calls = user_daily_usage.ai_calls + ${by}::int
      `;
      return;
    case "invites":
      await sql`
        insert into user_daily_usage (user_id, workspace_id, usage_date, invites)
        values (${userId}, ${workspaceId}, current_date, ${by}::int)
        on conflict (user_id, usage_date) do update set invites = user_daily_usage.invites + ${by}::int
      `;
      return;
    case "likes":
      await sql`
        insert into user_daily_usage (user_id, workspace_id, usage_date, likes)
        values (${userId}, ${workspaceId}, current_date, ${by}::int)
        on conflict (user_id, usage_date) do update set likes = user_daily_usage.likes + ${by}::int
      `;
      return;
  }
}

/** Today's totals for a whole workspace — a workspace can have several members, and a tier cap covers all of them. */
export async function workspaceUsageToday(workspaceId: string): Promise<Record<UsageField, number>> {
  const empty: Record<UsageField, number> = { posts: 0, comments: 0, dms: 0, ai_calls: 0, invites: 0, likes: 0 };
  if (!databaseConfigured()) return empty;

  const sql = db();
  const rows = await sql`
    select
      coalesce(sum(posts), 0)::int as posts,
      coalesce(sum(comments), 0)::int as comments,
      coalesce(sum(dms), 0)::int as dms,
      coalesce(sum(ai_calls), 0)::int as ai_calls,
      coalesce(sum(invites), 0)::int as invites,
      coalesce(sum(likes), 0)::int as likes
    from user_daily_usage
    where workspace_id = ${workspaceId} and usage_date = current_date
  `;
  return { ...empty, ...(rows[0] as Partial<Record<UsageField, number>>) };
}

/** Today's totals for one member, used for the tighter per-user cap on `users.daily_*_limit`. */
export async function userUsageToday(userId: string): Promise<Record<UsageField, number>> {
  const empty: Record<UsageField, number> = { posts: 0, comments: 0, dms: 0, ai_calls: 0, invites: 0, likes: 0 };
  if (!databaseConfigured()) return empty;

  const sql = db();
  const rows = await sql`
    select posts, comments, dms, ai_calls, invites, likes
    from user_daily_usage
    where user_id = ${userId} and usage_date = current_date
    limit 1
  `;
  return rows[0] ? { ...empty, ...(rows[0] as Partial<Record<UsageField, number>>) } : empty;
}

/** A clean run clears the streak — the counter tracks *consecutive* failures, not lifetime ones. */
export async function recordSuccess(userId: string): Promise<void> {
  if (!databaseConfigured()) return;
  const sql = db();
  await sql`
    update users set consecutive_error_count = 0, updated_at = now()
    where id = ${userId} and consecutive_error_count <> 0
  `;
}

/**
 * Counts a failure and pauses the account once the streak crosses the limit.
 *
 * One statement so the increment and the pause decision see the same value; done
 * as two round trips, a concurrent failure could step the counter past the
 * threshold without either call being the one that trips it.
 */
export async function recordFailure(userId: string, reason: string): Promise<{ paused: boolean }> {
  if (!databaseConfigured()) return { paused: false };
  const sql = db();

  const rows = await sql`
    update users
    set
      consecutive_error_count = consecutive_error_count + 1,
      autopilot_paused = case
        when consecutive_error_count + 1 >= ${CONSECUTIVE_ERROR_LIMIT}::int then true
        else autopilot_paused
      end,
      autopilot_pause_reason = case
        when consecutive_error_count + 1 >= ${CONSECUTIVE_ERROR_LIMIT}::int then ${reason}
        else autopilot_pause_reason
      end,
      updated_at = now()
    where id = ${userId}
    returning autopilot_paused, consecutive_error_count
  `;

  const row = rows[0] as { autopilot_paused: boolean; consecutive_error_count: number } | undefined;
  return { paused: Boolean(row?.autopilot_paused) };
}

/**
 * Writes one row to the activity log.
 *
 * Best-effort in its own try/catch, following `lib/rank/store.ts`: an audit
 * write that throws must never turn a successful action into a failed one, nor
 * a blocked action into an exception.
 */
export async function logAutomationEvent(input: {
  workspaceId: string | null;
  userId?: string | null;
  automationId?: string | null;
  postId?: string | null;
  action: string;
  outcome: AutomationOutcome;
  reason?: string | null;
  recipientHandle?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  if (!databaseConfigured()) return;
  try {
    const sql = db();
    await sql`
      insert into automation_log
        (workspace_id, user_id, automation_id, post_id, action, outcome, reason, recipient_handle, meta)
      values (
        ${input.workspaceId},
        ${input.userId ?? null},
        ${input.automationId ?? null},
        ${input.postId ?? null},
        ${input.action},
        ${input.outcome},
        ${input.reason ?? null},
        ${input.recipientHandle ?? null},
        ${JSON.stringify(input.meta ?? {})}::jsonb
      )
    `;
  } catch {
    // Deliberately swallowed.
  }
}

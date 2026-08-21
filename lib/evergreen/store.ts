import { db, databaseConfigured } from "@/lib/db";
import type { EvergreenItem, Platform } from "@/lib/types/db";

/**
 * The evergreen library.
 *
 * Pro tier sells "Auto-Plug, First Comment, Evergreen, and Cross-post Relay".
 * Evergreen is the one that recycles a post that worked instead of demanding a
 * new idea every day, which is the actual failure mode of founder-led posting.
 *
 * The scheduling rule is a cooldown, not a rotation. A rotation would republish
 * everything at a fixed cadence regardless of how recently each item ran; a
 * cooldown lets a library of three and a library of thirty both behave sensibly,
 * and guarantees the same post cannot reappear within `cooldown_days` of itself.
 */

export type EvergreenInput = {
  workspaceId: string;
  userId: string;
  content: string;
  platforms: Platform[];
  cooldownDays?: number;
  postId?: string | null;
};

/** Below this a "recycled" post is just a repeat, and readers notice. */
const MIN_COOLDOWN_DAYS = 7;
const DEFAULT_COOLDOWN_DAYS = 30;

export function normalizeCooldown(days: number | undefined): number {
  if (!days || !Number.isFinite(days)) return DEFAULT_COOLDOWN_DAYS;
  return Math.max(MIN_COOLDOWN_DAYS, Math.min(365, Math.trunc(days)));
}

export async function listItems(workspaceId: string): Promise<EvergreenItem[]> {
  if (!databaseConfigured()) return [];

  const sql = db();
  return (await sql`
    select * from evergreen_items
    where workspace_id = ${workspaceId}
    order by is_active desc, last_used_at asc nulls first, created_at desc
  `) as EvergreenItem[];
}

export async function addItem(input: EvergreenInput): Promise<EvergreenItem | null> {
  if (!databaseConfigured()) return null;
  const content = input.content.trim();
  if (!content) return null;

  const sql = db();
  const rows = (await sql`
    insert into evergreen_items (workspace_id, user_id, post_id, content, platforms, cooldown_days)
    values (
      ${input.workspaceId},
      ${input.userId},
      ${input.postId ?? null},
      ${content},
      ${input.platforms as unknown as string[]},
      ${normalizeCooldown(input.cooldownDays)}::int
    )
    returning *
  `) as EvergreenItem[];

  return rows[0] ?? null;
}

/** Pausing rather than deleting is the common case — a post that is stale this quarter is fine next one. */
export async function setActive(workspaceId: string, itemId: string, isActive: boolean): Promise<boolean> {
  if (!databaseConfigured()) return false;
  const sql = db();
  const rows = await sql`
    update evergreen_items set is_active = ${isActive}
    where id = ${itemId} and workspace_id = ${workspaceId}
    returning id
  `;
  return rows.length > 0;
}

export async function deleteItem(workspaceId: string, itemId: string): Promise<boolean> {
  if (!databaseConfigured()) return false;
  const sql = db();
  const rows = await sql`
    delete from evergreen_items
    where id = ${itemId} and workspace_id = ${workspaceId}
    returning id
  `;
  return rows.length > 0;
}

/**
 * Takes the next item due for recycling, and marks it used in the same statement.
 *
 * The claim is the important part. Read-then-update would let two refill ticks
 * pick the same item and publish it twice; the CTE below settles which row is
 * taken inside one statement, and `for update skip locked` means a concurrent
 * tick walks past it to the next candidate rather than blocking or duplicating.
 *
 * `last_used_at` is stamped at claim time rather than at publish time on purpose.
 * If publishing then fails, the item waits out its cooldown instead of being
 * retried immediately — a failing item that stayed permanently due would starve
 * every other item in the library.
 */
export async function claimNextDue(workspaceId: string): Promise<EvergreenItem | null> {
  if (!databaseConfigured()) return null;

  const sql = db();
  const rows = (await sql`
    with due as (
      select id
      from evergreen_items
      where workspace_id = ${workspaceId}
        and is_active
        and (
          last_used_at is null
          or last_used_at < now() - make_interval(days => cooldown_days)
        )
      order by last_used_at asc nulls first, created_at asc
      limit 1
      for update skip locked
    )
    update evergreen_items e
    set last_used_at = now(), use_count = e.use_count + 1
    from due
    where e.id = due.id
    returning e.*
  `) as EvergreenItem[];

  return rows[0] ?? null;
}

/** How many items are currently eligible — shown in the UI so an empty library is obvious. */
export async function dueCount(workspaceId: string): Promise<number> {
  if (!databaseConfigured()) return 0;

  const sql = db();
  const rows = await sql`
    select count(*)::int as total
    from evergreen_items
    where workspace_id = ${workspaceId}
      and is_active
      and (last_used_at is null or last_used_at < now() - make_interval(days => cooldown_days))
  `;
  return (rows[0]?.total as number) ?? 0;
}

/**
 * The work nothing else asks for.
 *
 * Most jobs are enqueued by something that just happened — a post published, a
 * user pressed a button. Two are not. Evergreen recycling and the weekly rank
 * audit are cadences, and until this existed the only thing that ever enqueued
 * an `evergreen_refill` was the "Queue one now" button, which made "recycles
 * your best posts for you" a manual feature with an automatic name.
 *
 * The sweep runs on every dispatcher tick and is written to be nearly free when
 * there is nothing to do: two indexed queries that return no rows. Every enqueue
 * is keyed to the period it belongs to, so a tick every minute produces one job
 * per period rather than one per tick — the key, not the tick rate, is what sets
 * the cadence.
 */
import { db, databaseConfigured } from "@/lib/db";
import { enqueue } from "@/lib/jobs/queue";
import { evergreenConfig, type EvergreenConfig } from "@/lib/automations/store";
import { logAutomationEvent } from "@/lib/automation/usage";
import { AUTO_RANKABLE_PLATFORMS } from "@/lib/jobs/rank";
import type { Automation, Platform } from "@/lib/types/db";

export type SweepResult = {
  evergreen: number;
  rank: number;
};

/** Which period a cadence is currently in. Whole days since the epoch, divided by the interval. */
function periodKey(everyDays: number): number {
  return Math.floor(Date.now() / (everyDays * 86_400_000));
}

/** ISO-ish week stamp. Only needs to be stable and to change once a week; it is a key, not a date. */
function weekKey(): string {
  const now = new Date();
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 1);
  const week = Math.floor((now.getTime() - startOfYear) / (7 * 86_400_000));
  return `${now.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

type EvergreenCandidate = Automation & { due_items: number };

/**
 * Workspaces whose evergreen library has something to recycle and whose owner
 * has switched recycling on.
 *
 * The automation row is the consent: a library full of items is a library, not
 * an instruction to start posting. The `not exists` on `jobs` keeps a workspace
 * that already has a refill waiting from accruing a second one if the cadence
 * period rolls over while the first is still queued.
 */
async function evergreenCandidates(): Promise<EvergreenCandidate[]> {
  const sql = db();
  return (await sql`
    select a.*, count(e.id)::int as due_items
    from automations a
    join evergreen_items e
      on e.workspace_id = a.workspace_id
      and e.is_active
      and (e.last_used_at is null or e.last_used_at < now() - make_interval(days => e.cooldown_days))
    where a.kind = 'evergreen'
      and a.is_active
      and not exists (
        select 1 from jobs j
        where j.kind = 'evergreen_refill'
          and j.workspace_id = a.workspace_id
          and j.status in ('pending', 'claimed')
      )
    group by a.id
  `) as EvergreenCandidate[];
}

type RankCandidate = {
  id: string;
  workspace_id: string;
  platform: Platform;
};

/** Active accounts on a platform a scheduled run can actually score. */
async function rankCandidates(): Promise<RankCandidate[]> {
  const sql = db();
  return (await sql`
    select id, workspace_id, platform
    from social_accounts
    where is_active
      and platform = any(${AUTO_RANKABLE_PLATFORMS as unknown as string[]}::text[])
      and not exists (
        select 1 from jobs j
        where j.kind = 'rank_refresh'
          and j.status in ('pending', 'claimed')
          and j.payload->>'socialAccountId' = social_accounts.id::text
      )
  `) as RankCandidate[];
}

/**
 * Enqueues everything the calendar says is due.
 *
 * Returns counts rather than throwing on a partial failure: the dispatcher's
 * real job is to drain the queue, and a sweep that could not enqueue a refill
 * must not stop the posts that are already waiting from going out.
 */
export async function sweepRecurringWork(): Promise<SweepResult> {
  if (!databaseConfigured()) return { evergreen: 0, rank: 0 };

  let evergreen = 0;
  let rank = 0;

  try {
    for (const automation of await evergreenCandidates()) {
      const config: EvergreenConfig = evergreenConfig(automation);

      // A simulated cadence records that it came due and enqueues nothing. The
      // refill handler creates a real scheduled post and has no automation to
      // check, so the decision has to be made here.
      if (automation.dry_run) {
        await logAutomationEvent({
          workspaceId: automation.workspace_id,
          userId: automation.user_id,
          automationId: automation.id,
          action: "automation.evergreen_cadence",
          outcome: "skipped",
          reason: `dry_run: would have recycled one of ${automation.due_items} due items`,
        });
        continue;
      }

      const job = await enqueue({
        kind: "evergreen_refill",
        workspaceId: automation.workspace_id,
        // One refill per configured period. The button on /app/evergreen passes
        // no key at all, so an explicit "queue one now" is still always honoured.
        idempotencyKey: `evergreen_refill:${automation.workspace_id}:${periodKey(config.everyDays)}`,
      });
      if (job) evergreen += 1;
    }
  } catch {
    // Swallowed on purpose; see above.
  }

  try {
    const week = weekKey();
    for (const account of await rankCandidates()) {
      const job = await enqueue({
        kind: "rank_refresh",
        workspaceId: account.workspace_id,
        payload: { socialAccountId: account.id },
        idempotencyKey: `rank_refresh:${account.id}:${week}`,
      });
      if (job) rank += 1;
    }
  } catch {
    // Same.
  }

  return { evergreen, rank };
}

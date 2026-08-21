/**
 * Re-scoring a connected account on a schedule.
 *
 * Starter sells "a weekly Spike Rank audit", which until now meant a score the
 * user could ask for by hand. This is the job that makes the word *weekly* true:
 * the sweep in `lib/jobs/schedule.ts` enqueues one of these per connected
 * account per week, and each run appends a row to `profile_scores` so the trend
 * line has something to draw.
 *
 * Only Bluesky is scored automatically, and that is a fact about the platforms
 * rather than a gap here. `lib/rank/bluesky.ts` reads a public AppView with no
 * credentials at all; `lib/rank/linkedin.ts` scores text the user pastes in,
 * because LinkedIn exposes no profile read at the scopes we hold; and X has no
 * scorer. An account we cannot score is skipped with that reason recorded,
 * never scored from stale or invented data.
 */
import { db, databaseConfigured } from "@/lib/db";
import { PermanentJobError } from "@/lib/jobs/handlers";
import type { Job } from "@/lib/jobs/queue";
import { rankBlueskyProfile } from "@/lib/rank/bluesky";
import { recordRankSnapshot } from "@/lib/rank/store";
import { logAutomationEvent } from "@/lib/automation/usage";
import type { Platform } from "@/lib/types/db";

/** The platforms a scheduled refresh can actually score without asking the user for anything. */
export const AUTO_RANKABLE_PLATFORMS: readonly Platform[] = ["bluesky"] as const;

export function isAutoRankable(platform: Platform): boolean {
  return AUTO_RANKABLE_PLATFORMS.includes(platform);
}

type AccountRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  platform: Platform;
  handle: string;
  is_active: boolean;
};

export async function rankRefresh(job: Job): Promise<void> {
  if (!databaseConfigured()) throw new Error("The database is not configured");

  const socialAccountId = job.payload?.socialAccountId;
  if (typeof socialAccountId !== "string") {
    throw new PermanentJobError("rank_refresh requires a socialAccountId");
  }

  const sql = db();
  const rows = (await sql`
    select id, workspace_id, user_id, platform, handle, is_active
    from social_accounts
    where id = ${socialAccountId}
    limit 1
  `) as AccountRow[];

  const account = rows[0];
  // Disconnected between the sweep and the run. Not an error — the sweep simply
  // will not enqueue another one.
  if (!account || !account.is_active) return;

  if (!isAutoRankable(account.platform)) {
    await logAutomationEvent({
      workspaceId: account.workspace_id,
      userId: account.user_id,
      action: "rank.refresh",
      outcome: "skipped",
      reason: `${account.platform} exposes no profile data we can score without the user pasting it in`,
      meta: { social_account_id: account.id },
    });
    return;
  }

  const result = await rankBlueskyProfile(account.handle);

  const snapshotId = await recordRankSnapshot(result, {
    userId: account.user_id,
    // Carried so the growth planner can find it: `latestRankResult` selects on
    // workspace_id, and a snapshot written without one is invisible to it.
    workspaceId: account.workspace_id,
  });

  await logAutomationEvent({
    workspaceId: account.workspace_id,
    userId: account.user_id,
    action: "rank.refresh",
    outcome: snapshotId ? "success" : "failed",
    reason: snapshotId
      ? `Scored ${account.handle} at ${result.score}/100`
      : "The score could not be written",
    meta: { social_account_id: account.id, score: result.score, profile_score_id: snapshotId },
  });
}

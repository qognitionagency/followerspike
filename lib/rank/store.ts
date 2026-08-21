/**
 * Spike Rank history, stored in `profile_scores`.
 *
 * Snapshots are what turn a one-off score into a trend, so they are written for
 * every completed run — including anonymous ones, where the handle is the only
 * subject key we have. Recording is best-effort: a rank result is useful to the
 * visitor whether or not we managed to store it, so callers never await a
 * failure here into their response.
 */
import { databaseConfigured, db } from "@/lib/db";
import type { RankPlatform, RankResult } from "@/lib/rank/types";

/** A re-run inside this window that produces the same score reuses the existing row. */
const DEDUPE_WINDOW_MINUTES = 60;

export type RankSnapshot = {
  id: string;
  platform: RankPlatform;
  handle: string;
  score: number;
  followersCount: number | null;
  createdAt: string;
};

export type RankTrend = {
  handle: string;
  platform: RankPlatform;
  snapshots: RankSnapshot[];
  /** Score change against the oldest snapshot in the window; null on a first run. */
  scoreDelta: number | null;
  followersDelta: number | null;
};

/** Must match the normalization the platform clients do, so one account is one trend line. */
export function normalizeRankHandle(platform: RankPlatform, handle: string): string {
  const base = handle.trim().replace(/^@/, "").replace(/\/+$/, "");

  if (platform === "bluesky") {
    return base.replace(/^(?:https?:\/\/)?bsky\.app\/profile\//i, "").toLowerCase();
  }

  if (platform === "x") {
    return base.replace(/^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\//i, "").toLowerCase();
  }

  return base.toLowerCase();
}

/**
 * Appends one snapshot. Returns the new row id, or null when the database is
 * unconfigured (local dev) or the write failed — never throws.
 */
export async function recordRankSnapshot(
  result: RankResult,
  options: { userId?: string | null; workspaceId?: string | null; freeToolLeadId?: string | null } = {}
): Promise<string | null> {
  if (!databaseConfigured()) return null;

  try {
    const sql = db();
    const handle = normalizeRankHandle(result.platform, result.handle);

    // Public profile reads are cached for 15 minutes, so a visitor who re-runs the
    // tool gets byte-identical data back. Reusing the recent row keeps refreshes
    // from stacking flat points onto the trend line.
    //
    // Scoped to the same subject as the write below, or an anonymous run of the
    // free tool on a handle a workspace also tracks would be handed back as that
    // workspace's snapshot — and `latestRankResult` would then read a row that
    // has no workspace on it at all.
    const recent = await sql`
      select id, score
      from profile_scores
      where platform = ${result.platform}
        and handle = ${handle}
        and workspace_id is not distinct from ${options.workspaceId ?? null}
        and created_at >= now() - make_interval(mins => ${DEDUPE_WINDOW_MINUTES})
      order by created_at desc
      limit 1
    `;

    if (recent.length && recent[0].score === result.score) {
      return recent[0].id as string;
    }

    const inserted = await sql`
      insert into profile_scores
        (platform, handle, score, pillars, top_fixes, observed, user_id, workspace_id, free_tool_lead_id)
      values (
        ${result.platform},
        ${handle},
        ${result.score},
        ${JSON.stringify(result.pillars)}::jsonb,
        ${JSON.stringify(result.topFixes)}::jsonb,
        ${JSON.stringify(result.observed)}::jsonb,
        ${options.userId ?? null},
        ${options.workspaceId ?? null},
        ${options.freeToolLeadId ?? null}
      )
      returning id
    `;

    return (inserted[0]?.id as string) ?? null;
  } catch {
    return null;
  }
}

/**
 * History for one account, oldest first so it can be charted directly.
 */
export async function getRankTrend(platform: RankPlatform, handle: string, limit = 30): Promise<RankTrend> {
  const normalized = normalizeRankHandle(platform, handle);
  const empty: RankTrend = { handle: normalized, platform, snapshots: [], scoreDelta: null, followersDelta: null };

  if (!databaseConfigured()) return empty;

  try {
    const sql = db();
    // Newest-first matches the index; the rows are reversed below for charting.
    const rows = await sql`
      select id, platform, handle, score,
             -- profile_scores has no denormalized follower column; the count is
             -- whatever the run observed at the time.
             (observed ->> 'followers')::int as followers_count,
             created_at
      from profile_scores
      where platform = ${platform} and handle = ${normalized}
      order by created_at desc
      limit ${limit}
    `;

    const snapshots: RankSnapshot[] = rows
      .map((row) => ({
        id: row.id as string,
        platform: row.platform as RankPlatform,
        handle: row.handle as string,
        score: row.score as number,
        followersCount: (row.followers_count as number | null) ?? null,
        createdAt: new Date(row.created_at as string).toISOString(),
      }))
      .reverse();

    if (snapshots.length < 2) {
      return { ...empty, snapshots };
    }

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];

    return {
      handle: normalized,
      platform,
      snapshots,
      scoreDelta: last.score - first.score,
      followersDelta:
        last.followersCount !== null && first.followersCount !== null
          ? last.followersCount - first.followersCount
          : null,
    };
  } catch {
    return empty;
  }
}

/**
 * Attaches a captured lead to the snapshot its run produced. Called after the
 * lead insert, since the snapshot is written first. Best-effort.
 */
export async function linkSnapshotToLead(snapshotId: string, leadId: string): Promise<void> {
  if (!databaseConfigured()) return;

  try {
    const sql = db();
    await sql`update profile_scores set free_tool_lead_id = ${leadId} where id = ${snapshotId}`;
  } catch {
    // The snapshot is still valid history without the lead link.
  }
}

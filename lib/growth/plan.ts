import { db, databaseConfigured } from "@/lib/db";
import type { Platform } from "@/lib/types/db";
import type { RankResult, RankCheck } from "@/lib/rank/types";

/**
 * Growth plans: a Spike Rank score turned into work.
 *
 * `growth_plans` existed and was read by exactly one thing — the data export
 * route — while `growth_plan_items` was never written at all. A score with no
 * plan behind it is a number that makes someone feel bad; the plan is what makes
 * it actionable, and Pro sells it as "Growth Plans that write straight into your
 * queue".
 *
 * An item is one of three kinds, and the distinction matters because each is
 * finished differently: a `profile_fix` is done off-platform and the user ticks
 * it, a `cadence_target` is an ongoing rate rather than a task, and a
 * `post_idea` is completed by actually publishing something — which is why it
 * is the only kind that carries a `post_id`.
 */

export type PlanItemKind = "profile_fix" | "post_idea" | "cadence_target";

export type GrowthPlanItem = {
  id: string;
  growth_plan_id: string;
  kind: PlanItemKind;
  title: string;
  body: string | null;
  post_id: string | null;
  completed_at: string | null;
  sort_order: number;
};

export type GrowthPlan = {
  id: string;
  workspace_id: string;
  user_id: string;
  profile_score_id: string | null;
  platform: Platform | null;
  target_pillar: string | null;
  status: "active" | "completed" | "abandoned";
  created_at: string;
};

export type GrowthPlanWithItems = GrowthPlan & { items: GrowthPlanItem[] };

/**
 * How many profile fixes become plan items.
 *
 * A plan long enough to be exhaustive is a plan nobody starts. The top few
 * failing checks carry most of the recoverable score anyway, since `topFixes` is
 * already ordered by impact.
 */
const MAX_FIXES = 5;

/** Effort labels, spelled out — "S" means nothing on its own in the UI. */
const EFFORT_LABEL: Record<string, string> = { S: "Quick", M: "Medium", L: "Deep work" };

/**
 * Turns a failing check into an item a person can act on.
 *
 * The check's own `fix` text is the body rather than something regenerated: it
 * was written against what was actually observed on the profile, and rephrasing
 * it through a model would only add a chance of contradicting the evidence.
 */
function fixToItem(check: RankCheck, sortOrder: number) {
  return {
    kind: "profile_fix" as const,
    title: check.label,
    body: [check.fix, check.evidence ? `Observed: ${check.evidence}` : null, EFFORT_LABEL[check.effort] ?? null]
      .filter(Boolean)
      .join("\n\n"),
    sortOrder,
  };
}

/**
 * The cadence target implied by a score.
 *
 * Expressed as posts per week rather than per day: a daily target is missed on
 * the first busy Tuesday and then abandoned, whereas a weekly one absorbs a bad
 * day without the streak feeling broken.
 */
function cadenceTarget(result: RankResult, sortOrder: number) {
  const cadence = result.pillars.find((pillar) => pillar.id === "cadence");
  const score = cadence?.score ?? 0;
  const target = score < 40 ? 3 : score < 70 ? 4 : 5;

  return {
    kind: "cadence_target" as const,
    title: `Post ${target}× per week on ${result.platform}`,
    body:
      `Your cadence pillar scored ${Math.round(score)}/100. ` +
      `Consistency moves this pillar faster than any single post does.`,
    sortOrder,
  };
}

/**
 * Post ideas drawn from the pillars that are actually weak.
 *
 * Seeded from the score rather than invented: an idea aimed at a pillar the
 * account already passes cannot improve the number it is supposed to improve.
 */
const PILLAR_IDEAS: Record<string, string> = {
  positioning: "Write the post that states plainly who you help and what you do. Most profiles never say it outright.",
  proof: "Share one specific result with a real number and the constraint you worked under.",
  cadence: "Publish a short observation from this week's work. Length is not what earns reach.",
  engagement: "Ask the question you actually want answered, and reply to every response.",
  conversion: "Explain what someone should do next if the post resonates, and make the path one step.",
};

function postIdeas(result: RankResult, startOrder: number) {
  return result.pillars
    .filter((pillar) => pillar.score < 70 && PILLAR_IDEAS[pillar.id])
    .slice(0, 3)
    .map((pillar, index) => ({
      kind: "post_idea" as const,
      title: `${pillar.label}: draft a post`,
      body: PILLAR_IDEAS[pillar.id],
      sortOrder: startOrder + index,
    }));
}

/**
 * Creates a plan from a score, replacing any plan already active for the
 * platform.
 *
 * Superseding rather than accumulating: two active plans for one platform give
 * contradictory advice from two different snapshots, and the older one is
 * reliably the wrong one.
 */
export async function createPlanFromRank(input: {
  workspaceId: string;
  userId: string;
  result: RankResult;
  profileScoreId?: string | null;
}): Promise<GrowthPlanWithItems | null> {
  if (!databaseConfigured()) return null;

  const sql = db();
  const platform = input.result.platform as Platform;

  await sql`
    update growth_plans set status = 'abandoned'
    where workspace_id = ${input.workspaceId} and platform = ${platform} and status = 'active'
  `;

  const weakest = [...input.result.pillars].sort((a, b) => a.score - b.score)[0];

  const planRows = (await sql`
    insert into growth_plans (workspace_id, user_id, profile_score_id, platform, target_pillar, status)
    values (
      ${input.workspaceId},
      ${input.userId},
      ${input.profileScoreId ?? null},
      ${platform},
      ${weakest?.id ?? null},
      'active'
    )
    returning *
  `) as GrowthPlan[];

  const plan = planRows[0];
  if (!plan) return null;

  const fixes = input.result.topFixes.slice(0, MAX_FIXES).map((check, index) => fixToItem(check, index));
  const drafts = [...fixes, cadenceTarget(input.result, fixes.length), ...postIdeas(input.result, fixes.length + 1)];

  for (const draft of drafts) {
    await sql`
      insert into growth_plan_items (growth_plan_id, kind, title, body, sort_order)
      values (${plan.id}, ${draft.kind}, ${draft.title}, ${draft.body}, ${draft.sortOrder}::int)
    `;
  }

  return (await getPlan(input.workspaceId, plan.id)) ?? { ...plan, items: [] };
}

export async function getPlan(workspaceId: string, planId: string): Promise<GrowthPlanWithItems | null> {
  if (!databaseConfigured()) return null;

  const sql = db();
  const planRows = (await sql`
    select * from growth_plans where id = ${planId} and workspace_id = ${workspaceId} limit 1
  `) as GrowthPlan[];

  const plan = planRows[0];
  if (!plan) return null;

  const items = (await sql`
    select * from growth_plan_items where growth_plan_id = ${plan.id} order by sort_order asc
  `) as GrowthPlanItem[];

  return { ...plan, items };
}

/** The workspace's current plan, newest first when several platforms have one. */
export async function activePlan(workspaceId: string, platform?: Platform): Promise<GrowthPlanWithItems | null> {
  if (!databaseConfigured()) return null;

  const sql = db();
  const rows = (await sql`
    select * from growth_plans
    where workspace_id = ${workspaceId}
      and status = 'active'
      and (${platform ?? null}::text is null or platform = ${platform ?? null})
    order by created_at desc
    limit 1
  `) as GrowthPlan[];

  return rows[0] ? getPlan(workspaceId, rows[0].id) : null;
}

/**
 * Ticks an item off, or un-ticks it.
 *
 * The workspace join is not decorative: item ids arrive from a form post, and
 * `growth_plan_items` has no workspace column of its own to filter on.
 */
export async function setItemComplete(input: {
  workspaceId: string;
  itemId: string;
  complete: boolean;
}): Promise<boolean> {
  if (!databaseConfigured()) return false;

  const sql = db();
  const rows = await sql`
    update growth_plan_items i
    set completed_at = case when ${input.complete}::boolean then now() else null end
    from growth_plans p
    where i.id = ${input.itemId}
      and p.id = i.growth_plan_id
      and p.workspace_id = ${input.workspaceId}
    returning i.id
  `;

  return rows.length > 0;
}

/** Links the post a `post_idea` produced, which is what marks that kind genuinely done. */
export async function attachPost(input: {
  workspaceId: string;
  itemId: string;
  postId: string;
}): Promise<boolean> {
  if (!databaseConfigured()) return false;

  const sql = db();
  const rows = await sql`
    update growth_plan_items i
    set post_id = ${input.postId}, completed_at = now()
    from growth_plans p
    where i.id = ${input.itemId}
      and p.id = i.growth_plan_id
      and p.workspace_id = ${input.workspaceId}
      and i.kind = 'post_idea'
    returning i.id
  `;

  return rows.length > 0;
}

/**
 * Closes a plan once every item is done.
 *
 * Called after any completion rather than on a schedule, so the plan's status
 * reflects its items at all times instead of until the next cron tick.
 */
export async function settlePlanStatus(workspaceId: string, planId: string): Promise<void> {
  if (!databaseConfigured()) return;

  const sql = db();
  await sql`
    update growth_plans p
    set status = case
      when not exists (
        select 1 from growth_plan_items i where i.growth_plan_id = p.id and i.completed_at is null
      ) then 'completed'
      else 'active'
    end
    where p.id = ${planId} and p.workspace_id = ${workspaceId} and p.status <> 'abandoned'
  `;
}

export type PlanProgress = { total: number; done: number; ratio: number };

export function planProgress(plan: GrowthPlanWithItems): PlanProgress {
  const total = plan.items.length;
  const done = plan.items.filter((item) => item.completed_at).length;
  return { total, done, ratio: total === 0 ? 0 : done / total };
}

/**
 * The most recent Spike Rank snapshot for a workspace, rehydrated into the shape
 * the scorer produced.
 *
 * `profile_scores` stores `pillars`, `top_fixes` and `observed` as jsonb exactly
 * as `lib/rank/score.ts` emitted them, so this is a cast rather than a
 * conversion — but it is a cast of data that has been through the database, so
 * the arrays are defaulted rather than assumed present.
 */
export async function latestRankResult(
  workspaceId: string,
  platform?: Platform
): Promise<{ result: RankResult; profileScoreId: string } | null> {
  if (!databaseConfigured()) return null;

  const sql = db();
  const rows = await sql`
    select id, platform, handle, score, pillars, top_fixes, observed
    from profile_scores
    where workspace_id = ${workspaceId}
      and (${platform ?? null}::text is null or platform = ${platform ?? null})
    order by created_at desc
    limit 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    profileScoreId: row.id as string,
    result: {
      platform: row.platform as RankResult["platform"],
      handle: row.handle as string,
      score: Number(row.score ?? 0),
      pillars: (row.pillars ?? []) as RankResult["pillars"],
      topFixes: (row.top_fixes ?? []) as RankResult["topFixes"],
      observed: (row.observed ?? {}) as RankResult["observed"],
    },
  };
}

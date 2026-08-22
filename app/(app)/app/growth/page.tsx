import Link from "next/link";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CheckCircle2, Circle, PenSquare, Target } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { requireAppSession } from "@/lib/session";
import { requireWorkspace } from "@/lib/workspace";
import {
  activePlan,
  createPlanFromRank,
  latestRankResult,
  planProgress,
  setItemComplete,
  settlePlanStatus,
  type GrowthPlanItem,
} from "@/lib/growth/plan";
import { platformLabel } from "@/lib/platforms/types";
import { activeConnections } from "@/lib/platforms/connect";
import { rankBlueskyProfile } from "@/lib/rank/bluesky";
import { recordRankSnapshot } from "@/lib/rank/store";
import { recordError } from "@/lib/observability/log";

export const metadata = { title: "Growth plan" };

/**
 * The growth plan.
 *
 * A Spike Rank score on its own is a number that makes someone feel bad; this is
 * the page that turns it into the three or four things actually worth doing. The
 * plan is always derived from a stored score, never from a fresh opinion — an
 * item that cannot be traced back to an observed check is advice, not a plan.
 */

const itemSchema = z.object({ itemId: z.string().uuid(), complete: z.enum(["true", "false"]) });

/**
 * Scores a connected profile without leaving the app.
 *
 * This page used to send a signed-in member to `/free-tools/spike-rank-bluesky`,
 * the public lead-capture tool, and then ask them to come back. That tool exists
 * to convert strangers; somebody who has already paid and already connected an
 * account should not be sent through it, retype a handle they have already
 * given us, and be pitched the product they are inside.
 *
 * The scorer is the same one the free tool and the weekly refresh use, so the
 * number here is the number everywhere.
 */
async function runRankNow() {
  "use server";
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const accounts = await activeConnections(context.workspace.id);
  // Bluesky only, and that is a fact about the platforms rather than a gap here:
  // its AppView is public, while X and LinkedIn expose no profile read at the
  // scopes we hold. `lib/jobs/rank.ts` skips them for the same reason.
  const target = accounts.find((account) => account.platform === "bluesky");
  if (!target) return;

  try {
    const result = await rankBlueskyProfile(target.handle);
    await recordRankSnapshot(result, {
      userId: session.userId,
      workspaceId: context.workspace.id,
    });
  } catch (error) {
    // A rank that cannot be read is not worth failing the page over; the member
    // still sees the plan they already have.
    await recordError(error, {
      source: "app/growth",
      kind: "rank_run_failed",
      userId: session.userId,
      workspaceId: context.workspace.id,
      context: { handle: target.handle },
    });
  }

  revalidatePath("/app/growth");
}

async function buildPlan() {
  "use server";
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const latest = await latestRankResult(context.workspace.id);
  if (!latest) return;

  await createPlanFromRank({
    workspaceId: context.workspace.id,
    userId: session.userId,
    result: latest.result,
    profileScoreId: latest.profileScoreId,
  });

  revalidatePath("/app/growth");
}

async function toggleItem(formData: FormData) {
  "use server";
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const parsed = itemSchema.safeParse({
    itemId: formData.get("itemId"),
    complete: formData.get("complete"),
  });
  if (!parsed.success) return;

  await setItemComplete({
    workspaceId: context.workspace.id,
    itemId: parsed.data.itemId,
    complete: parsed.data.complete === "true",
  });

  // The plan's status follows its items immediately, rather than waiting for a
  // tick that would leave a finished plan showing as active.
  const plan = await activePlan(context.workspace.id);
  if (plan) await settlePlanStatus(context.workspace.id, plan.id);

  revalidatePath("/app/growth");
}

const KIND_LABEL: Record<GrowthPlanItem["kind"], string> = {
  profile_fix: "Profile fix",
  post_idea: "Post idea",
  cadence_target: "Cadence",
};

export default async function GrowthPage() {
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const [plan, latest, accounts] = await Promise.all([
    activePlan(context.workspace.id),
    latestRankResult(context.workspace.id),
    activeConnections(context.workspace.id),
  ]);

  const rankable = accounts.find((account) => account.platform === "bluesky") ?? null;

  const progress = plan ? planProgress(plan) : null;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase text-[#0A66C2]">Growth plan</p>
        <h1 className="mt-2 text-3xl font-black text-[#191919]">
          {plan ? "What to do next." : "Turn your Spike Rank into a plan."}
        </h1>

        {plan && progress ? (
          <>
            <p className="mt-2 text-sm leading-6 text-[#666]">
              Built from your {plan.platform ? platformLabel(plan.platform) : "profile"} score
              {plan.target_pillar ? `, targeting ${plan.target_pillar}` : ""}.
            </p>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-bold text-[#666]">
                <span>
                  {progress.done} of {progress.total} done
                </span>
                <span>{Math.round(progress.ratio * 100)}%</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-[#E2E8F0]">
                <div className="h-2 rounded-full bg-[#0A66C2]" style={{ width: `${progress.ratio * 100}%` }} />
              </div>
            </div>
          </>
        ) : (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#666]">
            {latest
              ? `Your latest score is ${latest.result.score}/100 on ${platformLabel(latest.result.platform)}. Build a plan and the highest-impact fixes become a checklist.`
              : rankable
                ? `Score @${rankable.handle} and the highest-impact fixes become a checklist. A plan is only built from things actually observed on your profile.`
                : "Connect an account and we score it here. A plan is only built from things actually observed on your profile."}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          {latest ? (
            <>
              <form action={buildPlan}>
                <Button className="h-11 rounded-full bg-[#0A66C2] font-black text-white hover:bg-[#004182]">
                  <Target className="mr-2 h-4 w-4" />
                  {plan ? "Rebuild from latest score" : "Build my plan"}
                </Button>
              </form>
              {rankable ? (
                <form action={runRankNow}>
                  <Button className="h-11 rounded-full bg-[#F4F2EE] px-5 font-bold text-[#191919] hover:bg-[#E6E2DA]">
                    Re-score @{rankable.handle}
                  </Button>
                </form>
              ) : null}
            </>
          ) : rankable ? (
            <form action={runRankNow}>
              <Button className="h-11 rounded-full bg-[#0A66C2] font-black text-white hover:bg-[#004182]">
                <Target className="mr-2 h-4 w-4" />
                Score @{rankable.handle} now
              </Button>
            </form>
          ) : (
            <Link
              href="/app/accounts"
              className="inline-flex h-11 items-center rounded-full bg-[#0A66C2] px-5 font-black text-white hover:bg-[#004182]"
            >
              Connect an account to get scored
            </Link>
          )}
        </div>
      </section>

      {plan ? (
        <section className="space-y-3">
          {plan.items.map((item) => {
            const done = Boolean(item.completed_at);
            return (
              <article
                key={item.id}
                className={`rounded-xl border border-[#D6D6D6] bg-white p-5 shadow-sm ${done ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <form action={toggleItem} className="pt-0.5">
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="complete" value={done ? "false" : "true"} />
                    <button aria-label={done ? "Mark as not done" : "Mark as done"} className="text-[#0A66C2]">
                      {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-[#CBD5E1]" />}
                    </button>
                  </form>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#EEF3F8] px-2.5 py-0.5 text-[11px] font-black uppercase text-[#0A66C2]">
                        {KIND_LABEL[item.kind]}
                      </span>
                      <h2 className={`text-base font-black text-[#191919] ${done ? "line-through" : ""}`}>
                        {item.title}
                      </h2>
                    </div>
                    {item.body ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#555]">{item.body}</p>
                    ) : null}

                    {item.kind === "post_idea" && !done ? (
                      <Link
                        href="/app/composer"
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#0A66C2] hover:underline"
                      >
                        <PenSquare className="h-3.5 w-3.5" />
                        Draft it in the composer
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}

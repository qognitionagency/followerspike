import Link from "next/link";
import { CheckCircle2, Clock3, Link2, ListChecks, PenSquare, Recycle, ShieldCheck, Target } from "@/components/icons";
import { requireAppSession } from "@/lib/session";
import { requireWorkspace } from "@/lib/workspace";
import { db } from "@/lib/db";
import { onboardingState } from "@/lib/onboarding";
import { activeConnections } from "@/lib/platforms/connect";
import { dueCount } from "@/lib/evergreen/store";
import { activePlan, planProgress } from "@/lib/growth/plan";
import { activeProfile } from "@/lib/voice/store";
import { dailyLimitsForTier } from "@/lib/entitlements";
import { platformLabel } from "@/lib/platforms/types";

/**
 * The signed-in dashboard.
 *
 * Every number here has to be one something actually increments. The previous
 * version reported comments, connections and likes against their per-day limits,
 * which read as a working automation — but the retired LinkedIn engine was the
 * only thing that had ever written those counters, so all three were permanently
 * zero. `posts` is the one field `lib/jobs/publish.ts` increments, so it is the
 * one usage figure shown; the rest of the tiles report state that is real.
 */

type LogRow = {
  id: string;
  action: string;
  outcome: string;
  reason: string | null;
  recipient_handle: string | null;
  created_at: string;
};

type PostRow = {
  id: string;
  content: string;
  status: string;
  scheduled_at: string | null;
};

/** The actual loop the product runs, in the order a founder meets it. */
const growthSteps = [
  {
    title: "Model your voice",
    body: "Paste posts you have written or answer the interview, and everything generated afterwards sounds like you.",
    icon: PenSquare,
    href: "/app/voice",
  },
  {
    title: "Write once, fit every platform",
    body: "The composer splits one piece of writing into per-platform posts and threads, inside each character limit.",
    icon: PenSquare,
    href: "/app/composer",
  },
  {
    title: "Review before anything ships",
    body: "Scheduled posts wait in the queue. Nothing reaches a platform that you have not approved.",
    icon: ListChecks,
    href: "/app/queue",
  },
  {
    title: "Recycle what worked",
    body: "Posts in your evergreen library come back around after their cooldown, instead of being written twice.",
    icon: Recycle,
    href: "/app/evergreen",
  },
];

export default async function AppDashboardPage() {
  const session = await requireAppSession();
  const context = await requireWorkspace(session);
  const sql = db();

  const [usageData, logsData, postsData, connected, evergreenDue, plan, voice, postCountData] = await Promise.all([
    sql`select posts from user_daily_usage where user_id = ${session.userId} and usage_date = current_date limit 1`,
    sql`
      select id, action, outcome, reason, recipient_handle, created_at
      from automation_log
      where user_id = ${session.userId}
      order by created_at desc
      limit 5
    `,
    sql`
      select p.id, v.content, p.status, p.scheduled_at
      from posts p
      left join post_variants v on v.post_id = p.id and v.thread_order = 0
      where p.workspace_id = ${context.workspace.id}
        and p.status in ('draft', 'scheduled')
      order by p.created_at desc
      limit 1
    `,
    activeConnections(context.workspace.id),
    dueCount(context.workspace.id),
    activePlan(context.workspace.id),
    activeProfile(context.workspace.id),
    sql`select count(*)::int as n from posts where workspace_id = ${context.workspace.id}`,
  ]);

  const postsToday = (usageData[0]?.posts as number | undefined) ?? 0;
  const postLimit = dailyLimitsForTier(session.subscriptionTier).posts;
  const logs = logsData as unknown as LogRow[];
  const todayPost = postsData[0] as PostRow | undefined;
  const progress = plan ? planProgress(plan) : null;

  const setup = onboardingState({
    connectedAccounts: connected.length,
    hasVoiceProfile: Boolean(voice),
    hasAnyPost: ((postCountData[0]?.n as number | undefined) ?? 0) > 0,
  });

  // "Autopilot" means the account has consented and is not paused — the same
  // conditions lib/automation/safety.ts checks before it lets anything run.
  const autopilotActive =
    session.profile.autopilot_enabled &&
    !session.profile.autopilot_paused &&
    Boolean(session.profile.risk_acknowledged_at);

  const stats = [
    { label: "Posts today", value: `${postsToday}/${postLimit}`, icon: PenSquare },
    { label: "Connected accounts", value: `${connected.length}`, icon: Link2 },
    { label: "Evergreen due", value: `${evergreenDue}`, icon: Recycle },
    {
      label: "Plan progress",
      value: progress ? `${progress.done}/${progress.total}` : "None yet",
      icon: Target,
    },
  ];

  return (
    <div className="space-y-6">
      {/*
        Setup comes first, and only the current step is actionable.
        A dashboard of six equal nav items and four zeroed stat cards is a menu,
        and every item on it is a dead end until an account is connected.
      */}
      {!setup.complete ? (
        <section className="rounded-2xl border border-[#D6D6D6] bg-white p-6 shadow-sm lg:p-8">
          <p className="text-sm font-black uppercase text-[#0A66C2]">Get set up</p>
          <h1 className="mt-2 text-3xl font-black text-[#191919]">
            {setup.doneCount === 0
              ? "Three steps and you are posting."
              : `${3 - setup.doneCount} step${3 - setup.doneCount === 1 ? "" : "s"} to go.`}
          </h1>

          <ol className="mt-6 space-y-3">
            {setup.steps.map((step, index) => {
              const isCurrent = setup.current?.id === step.id;
              return (
                <li
                  key={step.id}
                  className={`rounded-xl border p-5 ${
                    isCurrent ? "border-[#0A66C2] bg-[#F8FBFF]" : "border-[#E2E2E2] bg-white"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-black ${
                        step.done
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                            ? "bg-[#0A66C2] text-white"
                            : "bg-[#EEF3F8] text-[#666]"
                      }`}
                    >
                      {step.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className={`font-black ${step.done ? "text-[#666] line-through" : "text-[#191919]"}`}>
                        {step.title}
                      </p>
                      {isCurrent ? (
                        <>
                          <p className="mt-1 text-sm leading-6 text-[#666]">{step.body}</p>
                          <Link
                            href={step.href}
                            className="mt-4 inline-flex h-11 items-center rounded-full bg-[#0A66C2] px-6 font-black text-white hover:bg-[#004182]"
                          >
                            {step.cta}
                          </Link>
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : (
      <section className="overflow-hidden rounded-2xl border border-[#D6D6D6] bg-[#111827] text-white shadow-sm">
        <div className="grid gap-px bg-white/10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-[#111827] p-6 lg:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-black text-cyan-200">
              <ShieldCheck className="h-4 w-4" />
              {autopilotActive ? "Publishing enabled" : "Review mode, nothing publishes unapproved"}
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight lg:text-5xl">
              Post in your own voice, on every platform.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Write once. FollowerSpike shapes it for X, LinkedIn, and Bluesky, holds it for your approval, and
              publishes on the schedule you set.
            </p>
          </div>
          <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-1">
            {[
              ["Voice", voice ? `Trained · v${voice.version}` : "Needs setup"],
              ["Audience", session.profile.icp_description ? "Defined" : "Add ICP"],
              [
                "Accounts",
                connected.length > 0
                  ? connected.map((account) => platformLabel(account.platform)).join(", ")
                  : "None connected",
              ],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#111827] p-5">
                <p className="text-xs font-black uppercase text-slate-400">{label}</p>
                <p className="mt-2 text-xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-[#D6D6D6] bg-white p-5 shadow-sm">
            <stat.icon className="h-5 w-5 text-[#0A66C2]" />
            <p className="mt-4 text-sm font-semibold text-[#666]">{stat.label}</p>
            <p className="mt-1 text-3xl font-black text-[#191919]">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <article className="rounded-2xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase text-[#0A66C2]">Next up</p>
                <h2 className="mt-1 text-2xl font-black text-[#191919]">Create the signal.</h2>
              </div>
              <span className="rounded-full bg-[#EEF3F8] px-3 py-1 text-xs font-black text-[#0A66C2]">
                {todayPost?.status ?? "nothing queued"}
              </span>
            </div>
            <p className="mt-5 whitespace-pre-line rounded-xl bg-[#F8FAFC] p-4 text-sm leading-7 text-[#333]">
              {todayPost?.content ??
                "No post is queued yet. Model your voice, connect an account, then write one piece in the composer."}
            </p>
            <Link
              href="/app/composer"
              className="mt-4 inline-flex h-11 items-center rounded-full bg-[#0A66C2] px-5 font-black text-white hover:bg-[#004182]"
            >
              <PenSquare className="mr-2 h-4 w-4" />
              Open the composer
            </Link>
          </article>
        </div>

        <div className="space-y-4">
          <article className="rounded-2xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
            <p className="text-sm font-black uppercase text-[#0A66C2]">How it works</p>
            <div className="mt-5 grid gap-3">
              {growthSteps.map((step) => (
                <Link
                  key={step.title}
                  href={step.href}
                  className="flex gap-3 rounded-xl border border-[#E2E2E2] bg-[#F8FAFC] p-4 hover:border-[#0A66C2]"
                >
                  <step.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#0A66C2]" />
                  <div>
                    <h3 className="font-black text-[#191919]">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#666]">{step.body}</p>
                  </div>
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-[#0A66C2]">Recent activity</p>
            <h2 className="mt-1 text-xl font-black text-[#191919]">Everything run on your behalf.</h2>
          </div>
          <Clock3 className="h-6 w-6 text-[#0A66C2]" />
        </div>
        <div className="mt-4 divide-y divide-[#E2E2E2]">
          {logs.length > 0 ? (
            logs.map((log) => (
              <div key={log.id} className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center">
                <span className="w-fit rounded-full bg-[#EEF3F8] px-2 py-1 font-black uppercase text-[#0A66C2]">{log.outcome}</span>
                <span className="font-semibold text-[#333]">{log.action}</span>
                <span className="text-[#666]">{log.recipient_handle || log.reason || "No target"}</span>
                <span className="text-xs text-[#888] sm:ml-auto">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-[#666]">
              No activity yet. Model your voice and connect an account to begin.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

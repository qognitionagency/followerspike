import { CheckCircle2, Clock3, MessageSquare, PauseCircle, Send, ShieldCheck } from "lucide-react";
import { requireAppSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

type UsageRow = {
  posts_today: number;
  comments_today: number;
  invites_today: number;
  likes_today: number;
};

type LogRow = {
  id: string;
  action: string;
  outcome: string;
  reason: string | null;
  target_name: string | null;
  created_at: string;
};

export default async function AppDashboardPage() {
  const session = await requireAppSession();
  const supabase = await createClient();

  const [{ data: usageData }, { data: logsData }, { count: queueCount }] = await Promise.all([
    supabase.from("user_daily_usage").select("*").eq("user_id", session.userId).maybeSingle(),
    supabase
      .from("automation_log")
      .select("id, action, outcome, reason, target_name, created_at")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.userId)
      .in("status", ["draft", "pending_approval", "scheduled"]),
  ]);

  const usage = (usageData as UsageRow | null) ?? {
    posts_today: 0,
    comments_today: 0,
    invites_today: 0,
    likes_today: 0,
  };
  const logs = (logsData as LogRow[] | null) ?? [];

  const stats = [
    { label: "Posts today", value: `${usage.posts_today}/${session.profile.daily_post_limit}`, icon: Send },
    { label: "Comments today", value: `${usage.comments_today}/${session.profile.daily_comment_limit}`, icon: MessageSquare },
    { label: "Invites today", value: `${usage.invites_today}/${session.profile.daily_invite_limit}`, icon: CheckCircle2 },
    { label: "Queue", value: `${queueCount ?? 0}`, icon: Clock3 },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-[#0A66C2]">Founder command center</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#191919]">Your LinkedIn autopilot.</h1>
            <p className="mt-2 text-sm leading-6 text-[#666]">
              {session.profile.approval_mode === "auto"
                ? "Auto mode is selected. Safety checks still decide what can run."
                : "Review mode is active. Approve the queue before anything executes."}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#EEF3F8] px-4 py-2 text-sm font-black text-[#0A66C2]">
            {session.profile.autopilot_paused ? <PauseCircle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            {session.profile.autopilot_paused ? "Autopilot paused" : "Safety controls active"}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[#D6D6D6] bg-white p-5 shadow-sm">
            <stat.icon className="h-5 w-5 text-[#0A66C2]" />
            <p className="mt-4 text-sm font-semibold text-[#666]">{stat.label}</p>
            <p className="mt-1 text-3xl font-black text-[#191919]">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-[#191919]">Recent automation log</h2>
        <div className="mt-4 divide-y divide-[#E2E2E2]">
          {logs.length > 0 ? (
            logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="rounded-full bg-[#EEF3F8] px-2 py-1 font-black uppercase text-[#0A66C2]">{log.outcome}</span>
                <span className="font-semibold text-[#333]">{log.action}</span>
                <span className="text-[#666]">{log.target_name || log.reason || "No target"}</span>
                <span className="ml-auto text-xs text-[#888]">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-[#666]">No automation activity yet. Configure voice and targets to begin.</p>
          )}
        </div>
      </section>
    </div>
  );
}

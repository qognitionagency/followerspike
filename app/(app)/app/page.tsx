import {
  CheckCircle2,
  Clock3,
  MessageSquareText,
  PauseCircle,
  Send,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
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

type PostRow = {
  id: string;
  content: string;
  status: string;
  scheduled_at: string | null;
};

type CommentRow = {
  id: string;
  generated_comment: string;
  target_author_name: string | null;
  target_post_snippet: string | null;
  relevance_score: number | null;
  status: string;
};

type ConnectionRow = {
  id: string;
  target_name: string | null;
  target_profile_url: string;
  personalized_note: string | null;
  status: string;
};

const growthSteps = [
  {
    title: "Create today’s post",
    body: "A founder-tone post drafted from your voice, niche, and audience.",
    icon: Sparkles,
  },
  {
    title: "Engage with relevant posts",
    body: "Like and comment on conversations your target audience already reads.",
    icon: MessageSquareText,
  },
  {
    title: "Connect with the right people",
    body: "Send connection requests to leaders, buyers, and peers that match your ICP.",
    icon: UserPlus,
  },
  {
    title: "Follow up after acceptance",
    body: "Prepare light DMs for accepted connections without cold-message spam.",
    icon: Send,
  },
];

export default async function AppDashboardPage() {
  const session = await requireAppSession();
  const supabase = await createClient();

  const [{ data: usageData }, { data: logsData }, { data: postsData }, { data: commentsData }, { data: connectionsData }] =
    await Promise.all([
      supabase.from("user_daily_usage").select("*").eq("user_id", session.userId).maybeSingle(),
      supabase
        .from("automation_log")
        .select("id, action, outcome, reason, target_name, created_at")
        .eq("user_id", session.userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("posts")
        .select("id, content, status, scheduled_at")
        .eq("user_id", session.userId)
        .in("status", ["draft", "pending_approval", "scheduled"])
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("comments")
        .select("id, generated_comment, target_author_name, target_post_snippet, relevance_score, status")
        .eq("user_id", session.userId)
        .in("status", ["pending_approval", "scheduled"])
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("connections")
        .select("id, target_name, target_profile_url, personalized_note, status")
        .eq("user_id", session.userId)
        .in("status", ["queued", "pending_approval"])
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

  const usage = (usageData as UsageRow | null) ?? {
    posts_today: 0,
    comments_today: 0,
    invites_today: 0,
    likes_today: 0,
  };
  const logs = (logsData as LogRow[] | null) ?? [];
  const todayPost = ((postsData as PostRow[] | null) ?? [])[0];
  const comments = (commentsData as CommentRow[] | null) ?? [];
  const connections = (connectionsData as ConnectionRow[] | null) ?? [];
  const autopilotActive = session.subscriptionTier === "pro" && session.profile.autopilot_enabled && !session.profile.autopilot_paused;

  const stats = [
    { label: "Posts", value: `${usage.posts_today}/${session.profile.daily_post_limit}`, icon: Sparkles },
    { label: "Comments", value: `${usage.comments_today}/${session.profile.daily_comment_limit}`, icon: MessageSquareText },
    { label: "Connections", value: `${usage.invites_today}/${session.profile.daily_invite_limit}`, icon: UserPlus },
    { label: "Likes", value: `${usage.likes_today}/${session.profile.daily_like_limit}`, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-[#D6D6D6] bg-[#111827] text-white shadow-sm">
        <div className="grid gap-px bg-white/10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-[#111827] p-6 lg:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-black text-cyan-200">
              {autopilotActive ? <ShieldCheck className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
              {autopilotActive ? "Autopilot active" : session.profile.approval_mode === "review" ? "Review mode active" : "Autopilot paused"}
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight lg:text-5xl">
              Your LinkedIn growth queue for today.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              FollowerSpike prepares the daily work a smart LinkedIn assistant would do: post, engage, connect, follow up,
              and pause when something needs your attention.
            </p>
          </div>
          <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-1">
            {[
              ["Voice", session.profile.brand_voice ? "Trained" : "Needs setup"],
              ["Audience", session.profile.icp_description ? "Defined" : "Add ICP"],
              ["LinkedIn", session.profile.linkedin_url ? "Connected profile" : "Add profile"],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#111827] p-5">
                <p className="text-xs font-black uppercase text-slate-400">{label}</p>
                <p className="mt-2 text-xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-[#D6D6D6] bg-white p-5 shadow-sm">
            <stat.icon className="h-5 w-5 text-[#0A66C2]" />
            <p className="mt-4 text-sm font-semibold text-[#666]">{stat.label} today</p>
            <p className="mt-1 text-3xl font-black text-[#191919]">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <article className="rounded-2xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase text-[#0A66C2]">Today’s post</p>
                <h2 className="mt-1 text-2xl font-black text-[#191919]">Create the signal.</h2>
              </div>
              <span className="rounded-full bg-[#EEF3F8] px-3 py-1 text-xs font-black text-[#0A66C2]">
                {todayPost?.status ?? "not generated"}
              </span>
            </div>
            <p className="mt-5 whitespace-pre-line rounded-xl bg-[#F8FAFC] p-4 text-sm leading-7 text-[#333]">
              {todayPost?.content ??
                "No post is queued yet. Train your voice, add your audience, then generate a post that FollowerSpike can review or run."}
            </p>
          </article>

          <article className="rounded-2xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
            <p className="text-sm font-black uppercase text-[#0A66C2]">Posts to like and comment on</p>
            <div className="mt-4 divide-y divide-[#E2E2E2]">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black text-[#191919]">{comment.target_author_name || "Target conversation"}</p>
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                        {comment.relevance_score ?? 7}/10 fit
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#666]">{comment.target_post_snippet || "Relevant industry post queued."}</p>
                    <p className="mt-3 rounded-xl bg-[#F8FAFC] p-3 text-sm leading-6 text-[#333]">{comment.generated_comment}</p>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-[#666]">No engagement items yet. Add target leaders or generate the next queue.</p>
              )}
            </div>
          </article>
        </div>

        <div className="space-y-4">
          <article className="rounded-2xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
            <p className="text-sm font-black uppercase text-[#0A66C2]">People to connect with</p>
            <div className="mt-4 divide-y divide-[#E2E2E2]">
              {connections.length > 0 ? (
                connections.map((connection) => (
                  <div key={connection.id} className="py-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#EEF3F8] text-[#0A66C2]">
                        <Users className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-black text-[#191919]">{connection.target_name || "Target profile"}</p>
                        <p className="mt-1 break-all text-sm text-[#666]">{connection.target_profile_url}</p>
                        <p className="mt-3 text-sm leading-6 text-[#333]">
                          {connection.personalized_note || "Connection request queued without a note."}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-[#666]">No connection requests queued. Add audience and seed leaders to begin.</p>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
            <p className="text-sm font-black uppercase text-[#0A66C2]">Growth loop</p>
            <div className="mt-5 grid gap-3">
              {growthSteps.map((step) => (
                <div key={step.title} className="flex gap-3 rounded-xl border border-[#E2E2E2] bg-[#F8FAFC] p-4">
                  <step.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#0A66C2]" />
                  <div>
                    <h3 className="font-black text-[#191919]">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#666]">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-[#0A66C2]">Recent activity</p>
            <h2 className="mt-1 text-xl font-black text-[#191919]">What FollowerSpike inspected or ran.</h2>
          </div>
          <Clock3 className="h-6 w-6 text-[#0A66C2]" />
        </div>
        <div className="mt-4 divide-y divide-[#E2E2E2]">
          {logs.length > 0 ? (
            logs.map((log) => (
              <div key={log.id} className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center">
                <span className="w-fit rounded-full bg-[#EEF3F8] px-2 py-1 font-black uppercase text-[#0A66C2]">{log.outcome}</span>
                <span className="font-semibold text-[#333]">{log.action}</span>
                <span className="text-[#666]">{log.target_name || log.reason || "No target"}</span>
                <span className="text-xs text-[#888] sm:ml-auto">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-[#666]">No activity yet. Configure voice, audience, and LinkedIn connection to begin.</p>
          )}
        </div>
      </section>
    </div>
  );
}

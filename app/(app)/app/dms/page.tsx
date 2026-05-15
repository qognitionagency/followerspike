import { MailCheck, MessageSquareReply, Send, ShieldCheck } from "lucide-react";
import { requireAppSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

type ConnectionRow = {
  id: string;
  target_name: string | null;
  target_profile_url: string;
  personalized_note: string | null;
  status: string;
  created_at: string;
};

const replyPrompts = [
  "Thanks for connecting. I saw your work around [topic] and it felt relevant to what I am building.",
  "Appreciate the connection. Curious what you are focused on this quarter?",
  "Glad to connect. I usually share practical notes on LinkedIn growth, positioning, and founder-led distribution.",
];

export default async function DmsPage() {
  const session = await requireAppSession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("connections")
    .select("id, target_name, target_profile_url, personalized_note, status, created_at")
    .eq("user_id", session.userId)
    .in("status", ["accepted", "connected", "pending_follow_up"])
    .order("created_at", { ascending: false })
    .limit(12);

  const acceptedConnections = (data as ConnectionRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-[#0A66C2]">Accepted-connection follow-up</p>
            <h1 className="mt-2 text-3xl font-black text-[#191919]">DMs without cold-message spam.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#666]">
              FollowerSpike focuses V1 DMs on people who already accepted your connection. Keep it light, useful, and easy to pause.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#EEF3F8] px-4 py-2 text-sm font-black text-[#0A66C2]">
            <ShieldCheck className="h-4 w-4" />
            Accepted connections only
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-2xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <MailCheck className="h-6 w-6 text-[#0A66C2]" />
            <h2 className="text-2xl font-black text-[#191919]">Connections ready for follow-up</h2>
          </div>
          <div className="mt-5 divide-y divide-[#E2E2E2]">
            {acceptedConnections.length > 0 ? (
              acceptedConnections.map((connection) => (
                <div key={connection.id} className="py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-black text-[#191919]">{connection.target_name || "Accepted connection"}</p>
                      <p className="mt-1 break-all text-sm text-[#666]">{connection.target_profile_url}</p>
                    </div>
                    <span className="w-fit rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                      {connection.status}
                    </span>
                  </div>
                  <p className="mt-3 rounded-xl bg-[#F8FAFC] p-3 text-sm leading-6 text-[#333]">
                    {connection.personalized_note || "Draft a warm follow-up based on their profile, role, and the reason you connected."}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-[#666]">
                No accepted connections are ready for follow-up yet. When a queued connection accepts, the follow-up will appear here.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#D6D6D6] bg-[#111827] p-6 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <MessageSquareReply className="h-6 w-6 text-cyan-200" />
            <h2 className="text-2xl font-black">Reply drafts</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Use simple, human follow-ups. Pro autopilot can send approved accepted-connection DMs; replies should still stay easy to review.
          </p>
          <div className="mt-5 grid gap-3">
            {replyPrompts.map((prompt) => (
              <div key={prompt} className="rounded-xl border border-white/10 bg-white/[0.06] p-4 text-sm leading-6 text-slate-200">
                {prompt}
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-white/10 p-3 text-sm font-semibold text-cyan-100">
            <Send className="h-4 w-4" />
            Cold DM sequences stay out of V1.
          </div>
        </div>
      </section>
    </div>
  );
}

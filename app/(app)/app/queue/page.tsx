import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Check, PenLine, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAppSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { QueueItem } from "@/lib/types";

const queueActionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["post", "comment", "connection"]),
  action: z.enum(["approve", "skip", "regenerate"]),
});

async function updateQueueItem(formData: FormData) {
  "use server";
  const session = await requireAppSession();
  const parsed = queueActionSchema.safeParse({
    id: formData.get("id"),
    type: formData.get("type"),
    action: formData.get("action"),
  });

  if (!parsed.success) return;

  const supabase = await createClient();
  const now = new Date();
  const scheduledAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  if (parsed.data.type === "post") {
    await supabase
      .from("posts")
      .update({
        status: parsed.data.action === "skip" ? "skipped" : "scheduled",
        approved_by_user: parsed.data.action === "approve",
        scheduled_at: parsed.data.action === "approve" ? scheduledAt : null,
      })
      .eq("id", parsed.data.id)
      .eq("user_id", session.userId);
  }

  if (parsed.data.type === "comment") {
    await supabase
      .from("comments")
      .update({
        status: parsed.data.action === "skip" ? "skipped" : "scheduled",
        approved_by_user: parsed.data.action === "approve",
        scheduled_at: parsed.data.action === "approve" ? scheduledAt : null,
      })
      .eq("id", parsed.data.id)
      .eq("user_id", session.userId);
  }

  if (parsed.data.type === "connection") {
    await supabase
      .from("connections")
      .update({
        status: parsed.data.action === "skip" ? "withdrawn" : "queued",
        scheduled_at: parsed.data.action === "approve" ? scheduledAt : null,
      })
      .eq("id", parsed.data.id)
      .eq("user_id", session.userId);
  }

  revalidatePath("/app/queue");
}

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
  scheduled_at: string | null;
};

type ConnectionRow = {
  id: string;
  target_name: string | null;
  target_profile_url: string;
  personalized_note: string | null;
  status: string;
  scheduled_at: string | null;
};

export default async function QueuePage() {
  const session = await requireAppSession();
  const supabase = await createClient();

  const [{ data: postsData }, { data: commentsData }, { data: connectionsData }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, content, status, scheduled_at")
      .eq("user_id", session.userId)
      .in("status", ["draft", "pending_approval", "scheduled"])
      .order("created_at", { ascending: false }),
    supabase
      .from("comments")
      .select("id, generated_comment, target_author_name, target_post_snippet, relevance_score, status, scheduled_at")
      .eq("user_id", session.userId)
      .in("status", ["pending_approval", "scheduled"])
      .order("created_at", { ascending: false }),
    supabase
      .from("connections")
      .select("id, target_name, target_profile_url, personalized_note, status, scheduled_at")
      .eq("user_id", session.userId)
      .in("status", ["queued", "pending_approval"])
      .order("created_at", { ascending: false }),
  ]);

  const posts = (postsData as PostRow[] | null) ?? [];
  const comments = (commentsData as CommentRow[] | null) ?? [];
  const connections = (connectionsData as ConnectionRow[] | null) ?? [];

  const items: QueueItem[] = [
    ...posts.map((post) => ({
      id: post.id,
      type: "post" as const,
      title: "LinkedIn post",
      body: post.content,
      target: null,
      status: post.status,
      scheduledAt: post.scheduled_at,
    })),
    ...comments.map((comment) => ({
      id: comment.id,
      type: "comment" as const,
      title: `Comment${comment.target_author_name ? ` on ${comment.target_author_name}` : ""}`,
      body: comment.generated_comment,
      target: comment.target_post_snippet,
      status: comment.status,
      scheduledAt: comment.scheduled_at,
      score: comment.relevance_score ?? undefined,
    })),
    ...connections.map((connection) => ({
      id: connection.id,
      type: "connection" as const,
      title: `Connection request${connection.target_name ? ` to ${connection.target_name}` : ""}`,
      body: connection.personalized_note || "Connection request queued without a note.",
      target: connection.target_profile_url,
      status: connection.status,
      scheduledAt: connection.scheduled_at,
    })),
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase text-[#0A66C2]">Daily growth queue</p>
        <h1 className="mt-2 text-3xl font-black text-[#191919]">Approve posts, engagement, and connections.</h1>
        <p className="mt-2 text-sm leading-6 text-[#666]">
          Review mode builds trust before live execution. Autopilot can still pause when daily limits, timing windows, or account checks say no.
        </p>
      </section>

      <section className="space-y-4">
        {items.length > 0 ? (
          items.map((item) => (
            <article key={`${item.type}-${item.id}`} className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-[#0A66C2]">{item.type}</p>
                  <h2 className="text-xl font-black text-[#191919]">{item.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#EEF3F8] px-3 py-1 text-xs font-black text-[#0A66C2]">{item.status}</span>
                  {item.score ? (
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">{item.score}/10</span>
                  ) : null}
                </div>
              </div>
              {item.target ? <p className="mt-4 rounded-lg bg-[#F8FAFC] p-3 text-sm text-[#666]">{item.target}</p> : null}
              <p className="mt-4 whitespace-pre-line text-base leading-8 text-[#333]">{item.body}</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-4">
                {[
                  { action: "approve", label: "Approve", icon: Check },
                  { action: "regenerate", label: "Regenerate", icon: RotateCw },
                  { action: "skip", label: "Skip", icon: X },
                  { action: "approve", label: "Edit Later", icon: PenLine },
                ].map((button) => (
                  <form key={button.label} action={updateQueueItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="type" value={item.type} />
                    <input type="hidden" name="action" value={button.action} />
                    <Button className="h-11 w-full rounded-full bg-[#EEF3F8] font-bold text-[#0A66C2] hover:bg-[#DDECF7]">
                      <button.icon className="h-4 w-4" />
                      {button.label}
                    </Button>
                  </form>
                ))}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-[#D6D6D6] bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-black text-[#191919]">Queue is clear.</h2>
            <p className="mt-2 text-sm text-[#666]">
              Generated posts, relevant comments, likes, connection requests, and follow-up DMs will appear here for approval.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

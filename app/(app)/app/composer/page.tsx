import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAppSession } from "@/lib/session";
import { requireWorkspace } from "@/lib/workspace";
import { createDraft, schedulePost } from "@/lib/compose/composer";
import { activeConnections } from "@/lib/platforms/connect";
import { ALL_PLATFORMS } from "@/lib/platforms/registry";
import { platformLabel } from "@/lib/platforms/types";
import { ComposerForm, type ComposerPlatformOption } from "@/components/app/ComposerForm";
import type { ThreadPlatform } from "@/lib/compose/thread";

export const metadata = { title: "Composer" };

const composeSchema = z.object({
  content: z.string().min(1).max(20_000),
  platforms: z.string().min(1),
  numbered: z.enum(["true", "false"]),
  intent: z.enum(["draft", "schedule"]),
});

async function compose(formData: FormData) {
  "use server";
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const parsed = composeSchema.safeParse({
    content: formData.get("content"),
    platforms: formData.get("platforms"),
    numbered: formData.get("numbered"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) {
    redirect("/app/composer?error=Check+the+form+and+try+again");
  }

  const platforms = parsed.data.platforms
    .split(",")
    .filter((value): value is ThreadPlatform => ALL_PLATFORMS.includes(value as ThreadPlatform));

  const draft = await createDraft({
    workspaceId: context.workspace.id,
    userId: session.userId,
    content: parsed.data.content,
    platforms,
    numbered: parsed.data.numbered === "true",
  });

  if (!draft.ok) {
    redirect(`/app/composer?error=${encodeURIComponent(draft.error)}`);
  }

  if (parsed.data.intent === "schedule") {
    // Ten minutes out rather than immediately: a scheduled post the author can
    // still catch in the queue is friendlier than one already gone.
    const scheduledAt = new Date(Date.now() + 10 * 60 * 1000);
    const scheduled = await schedulePost({
      workspaceId: context.workspace.id,
      userId: session.userId,
      postId: draft.postId,
      scheduledAt,
      tier: session.subscriptionTier,
    });
    if (!scheduled.ok) {
      redirect(`/app/composer?error=${encodeURIComponent(scheduled.error)}`);
    }
  }

  revalidatePath("/app/queue");
  redirect("/app/queue");
}

export default async function ComposerPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const session = await requireAppSession();
  const context = await requireWorkspace(session);
  const connected = await activeConnections(context.workspace.id);

  const options: ComposerPlatformOption[] = ALL_PLATFORMS.map((platform) => {
    const account = connected.find((item) => item.platform === platform);
    return {
      platform: platform as ThreadPlatform,
      label: platformLabel(platform),
      handle: account?.handle ?? "",
      connected: Boolean(account),
    };
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase text-[#0A66C2]">Composer</p>
        <h1 className="mt-2 text-3xl font-black text-[#191919]">Write once. Publish native.</h1>
        <p className="mt-2 text-sm leading-6 text-[#666]">
          Each platform gets its own copy, split to its own limits. Nothing leaves until you
          schedule it, and the queue holds it until then.
        </p>
      </section>

      <ComposerForm options={options} action={compose} error={searchParams.error} />
    </div>
  );
}

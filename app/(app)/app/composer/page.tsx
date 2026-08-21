import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAppSession } from "@/lib/session";
import { requireWorkspace } from "@/lib/workspace";
import { createDraft, schedulePost } from "@/lib/compose/composer";
import { activeConnections } from "@/lib/platforms/connect";
import { ALL_PLATFORMS } from "@/lib/platforms/registry";
import { platformLabel } from "@/lib/platforms/types";
import { generateInVoice } from "@/lib/voice/generate";
import { activeProfile, recordCalibration } from "@/lib/voice/store";
import { ComposerForm, type ComposerPlatformOption, type GenerateResult } from "@/components/app/ComposerForm";
import type { ThreadPlatform } from "@/lib/compose/thread";
import type { Platform } from "@/lib/types/db";

export const metadata = { title: "Composer" };

const composeSchema = z.object({
  content: z.string().min(1).max(20_000),
  platforms: z.string().min(1),
  numbered: z.enum(["true", "false"]),
  intent: z.enum(["draft", "schedule"]),
  // Present only when the text started as a generation. Both are needed to
  // attribute a correction to the profile that produced the draft.
  generatedText: z.string().max(20_000).optional(),
  voiceProfileId: z.string().uuid().optional(),
});

const generateSchema = z.object({
  topic: z.string().min(3).max(500),
  platform: z.enum(["x", "linkedin", "bluesky"]).optional(),
});

const discardSchema = z.object({
  generatedText: z.string().min(1).max(20_000),
  voiceProfileId: z.string().uuid(),
});

/**
 * Writes one draft in the author's saved voice.
 *
 * Returns its result instead of redirecting: the text lands back in the editor
 * for the author to change, and it is that change — or the absence of one — that
 * `voice_calibrations` records when the form is finally submitted.
 */
async function generate(input: { topic: string; platform?: Platform }): Promise<GenerateResult> {
  "use server";
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Describe what the post should be about." };
  }

  const result = await generateInVoice({
    workspaceId: context.workspace.id,
    userId: session.userId,
    topic: parsed.data.topic,
    platform: parsed.data.platform,
  });

  if (!result.ok) {
    // Both failures are the user's to act on, and neither is recoverable by
    // retrying the same call, so they are reported rather than swallowed.
    return result.reason === "no_profile"
      ? { ok: false, error: "Build a voice profile first — the composer will not guess at how you sound." }
      : { ok: false, error: "The AI provider could not be reached, so nothing was generated." };
  }

  return {
    ok: true,
    content: result.content,
    rationale: result.rationale,
    voiceProfileId: result.voiceProfileId,
  };
}

/** An explicit rejection, which is a stronger signal than an edit and has no other way to be recorded. */
async function discard(formData: FormData) {
  "use server";
  await requireAppSession();

  const parsed = discardSchema.safeParse({
    generatedText: formData.get("generatedText"),
    voiceProfileId: formData.get("voiceProfileId"),
  });
  if (!parsed.success) return;

  await recordCalibration({
    voiceProfileId: parsed.data.voiceProfileId,
    generatedText: parsed.data.generatedText,
    verdict: "rejected",
  });

  revalidatePath("/app/composer");
}

async function compose(formData: FormData) {
  "use server";
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const parsed = composeSchema.safeParse({
    content: formData.get("content"),
    platforms: formData.get("platforms"),
    numbered: formData.get("numbered"),
    intent: formData.get("intent"),
    generatedText: formData.get("generatedText") || undefined,
    voiceProfileId: formData.get("voiceProfileId") || undefined,
  });
  if (!parsed.success) {
    redirect("/app/composer?error=Check+the+form+and+try+again");
  }

  const platforms = parsed.data.platforms
    .split(",")
    .filter((value): value is ThreadPlatform => ALL_PLATFORMS.includes(value as ThreadPlatform));

  // Recorded before the draft is written. The calibration is about the voice,
  // not about whether the post saved, and a failed save would otherwise discard
  // the most useful signal the user just produced.
  if (parsed.data.generatedText && parsed.data.voiceProfileId) {
    const unchanged = parsed.data.content.trim() === parsed.data.generatedText.trim();
    await recordCalibration({
      voiceProfileId: parsed.data.voiceProfileId,
      generatedText: parsed.data.generatedText,
      editedText: unchanged ? null : parsed.data.content,
      verdict: unchanged ? "kept" : "edited",
    });
  }

  const draft = await createDraft({
    workspaceId: context.workspace.id,
    userId: session.userId,
    content: parsed.data.content,
    platforms,
    numbered: parsed.data.numbered === "true",
    createdVia: parsed.data.voiceProfileId ? "voice_cloner" : "manual",
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

  const [connected, voice] = await Promise.all([
    activeConnections(context.workspace.id),
    activeProfile(context.workspace.id),
  ]);

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

      <ComposerForm
        options={options}
        action={compose}
        generate={generate}
        discard={discard}
        hasVoice={Boolean(voice)}
        voiceName={voice ? `${voice.name} · v${voice.version}` : null}
        error={searchParams.error}
      />
    </div>
  );
}

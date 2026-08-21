import { generateJson, type AiResult } from "@/lib/ai/client";
import { GENERATE_IN_VOICE_PROMPT } from "@/lib/ai/prompts";
import type { AiUsageContext } from "@/lib/ai/usage";
import { activeProfile, recentEdits, type StoredVoiceProfile } from "@/lib/voice/store";
import { similarExemplars } from "@/lib/voice/embeddings";
import { renderCorrections, renderExemplars, renderVoiceInstructions } from "@/lib/voice/prompt";
import { resolveForPlatform } from "@/lib/voice/types";
import { maxChars } from "@/lib/platforms/registry";
import type { Platform } from "@/lib/types/db";

/**
 * Generating a post in the user's own voice.
 *
 * This is the module that finally consumes everything `lib/voice` builds. Before
 * it existed, a workspace could complete the interview, import posts, accrue
 * corrections and index exemplars, and none of it reached a prompt — the voice
 * profile was a page you could look at.
 *
 * Three signals are assembled here, in ascending order of how much they are
 * trusted: the profile describes the style, the exemplars show it, and the
 * corrections say what the model got wrong last time.
 */

export type VoiceDraft = {
  content: string;
  rationale: string;
  /** Which profile produced it, so the calibration can be attributed on save. */
  voiceProfileId: string;
  /** Echoed back so the caller can record whether the author changed it. */
  generatedText: string;
};

export type VoiceGenerationFailure =
  | { reason: "no_profile" }
  | { reason: "ai_unavailable"; detail: AiResult<unknown> & { ok: false } };

export type VoiceGenerationResult =
  | ({ ok: true } & VoiceDraft)
  | ({ ok: false } & VoiceGenerationFailure);

/** How many retrieved exemplars go into a prompt. Enough to establish rhythm, few enough to leave room for the topic. */
const MAX_EXEMPLARS = 4;

/** Corrections are heavy — a handful is plenty to establish a pattern, and every one costs tokens twice. */
const MAX_CORRECTIONS = 3;

/**
 * The exemplars most relevant to what is being written about.
 *
 * Falls back to the profile's own stored exemplars when retrieval returns
 * nothing, which is the normal case with no embedding provider configured. The
 * stored ones are not topic-matched, but generic exemplars of the right voice
 * beat none.
 */
async function exemplarsFor(
  profile: StoredVoiceProfile,
  topic: string,
  context: AiUsageContext
): Promise<string[]> {
  const retrieved = await similarExemplars({
    userId: profile.user_id,
    topic,
    limit: MAX_EXEMPLARS,
    context,
  });

  if (retrieved.length > 0) {
    return retrieved.map((item) => item.content);
  }

  return profile.profile.exemplars.slice(0, MAX_EXEMPLARS);
}

/**
 * Writes one post.
 *
 * Returns a discriminated failure rather than falling back to canned prose. The
 * `OrFallback` pattern elsewhere in `lib/ai/generators.ts` is a legitimate choice
 * for a marketing page; it is the wrong one here, because this output is
 * published under the author's real name and a caller has to be able to tell
 * that the model never ran.
 */
export async function generateInVoice(input: {
  workspaceId: string;
  userId: string;
  topic: string;
  /** Tailors length and register to where it will be published. */
  platform?: Platform;
}): Promise<VoiceGenerationResult> {
  const context: AiUsageContext = { workspaceId: input.workspaceId, userId: input.userId };

  const stored = await activeProfile(input.workspaceId);
  if (!stored) {
    return { ok: false, reason: "no_profile" };
  }

  const profile = input.platform
    ? resolveForPlatform(stored.profile, input.platform)
    : stored.profile;

  const [exemplars, corrections] = await Promise.all([
    exemplarsFor(stored, input.topic, context),
    recentEdits(stored.id, MAX_CORRECTIONS),
  ]);

  const sections = [
    renderVoiceInstructions(profile),
    renderExemplars(exemplars),
    renderCorrections(corrections),
  ].filter(Boolean);

  const budget = input.platform ? maxChars(input.platform) : null;

  const result = await generateJson<{ content: string; rationale: string }>(
    [
      { role: "system", content: GENERATE_IN_VOICE_PROMPT },
      { role: "user", content: sections.join("\n\n---\n\n") },
      {
        role: "user",
        content: [
          `Write one post about: ${input.topic}`,
          input.platform ? `It will be published on ${input.platform}.` : null,
          // Advisory rather than enforced: the composer splits over-long text
          // into a thread anyway, so a hard truncation here would damage a post
          // that was going to be fine.
          budget ? `Aim to stay under ${budget} characters if you can do it without padding or cutting the point short.` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    {
      validate: (value): value is { content: string; rationale: string } =>
        typeof value === "object" &&
        value !== null &&
        typeof (value as { content?: unknown }).content === "string" &&
        (value as { content: string }).content.trim().length > 0,
      schema: {
        type: "object",
        properties: { content: { type: "string" }, rationale: { type: "string" } },
        required: ["content", "rationale"],
      },
      actionType: "generate_in_voice",
      context,
    }
  );

  if (!result.ok) {
    return { ok: false, reason: "ai_unavailable", detail: result };
  }

  const content = result.value.content.trim();

  return {
    ok: true,
    content,
    rationale: result.value.rationale ?? "",
    voiceProfileId: stored.id,
    generatedText: content,
  };
}

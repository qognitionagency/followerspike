import { generateJson, type AiResult } from "@/lib/ai/client";
import { SYNTHESIZE_VOICE_PROMPT } from "@/lib/ai/prompts";
import type { AiUsageContext } from "@/lib/ai/usage";
import { transcriptFor, type InterviewAnswers } from "@/lib/voice/interview";
import { parseVoiceProfile, voiceProfileShapeSchema, type VoiceProfileShape } from "@/lib/voice/types";

/**
 * Turning raw signal into a voice profile.
 *
 * Kept out of `lib/ai/generators.ts` on purpose: that module is the LinkedIn-era
 * generator surface and every export there carries an `OrFallback` twin. A voice
 * profile must never fall back. A canned profile would be silently wrong in the
 * one place wrongness is hardest to notice — it does not error, it just makes
 * every future post sound like somebody else, under the user's real name.
 */

/**
 * Hard cap on how much writing goes into one synthesis call.
 *
 * Long enough for the interview plus a dozen posts; short enough that a user who
 * pastes their entire blog does not blow the context window or the bill.
 */
const MAX_SAMPLE_CHARS = 24_000;

/**
 * A partial edit to a profile.
 *
 * `sliders` and `structure` are partial in their own right, not all-or-nothing:
 * a user nudging one axis is the common case, and requiring all six back would
 * force every caller to re-send values it never intended to change.
 */
export type VoiceProfileEdit = Omit<Partial<VoiceProfileShape>, "sliders" | "structure"> & {
  sliders?: Partial<VoiceProfileShape["sliders"]>;
  structure?: Partial<VoiceProfileShape["structure"]>;
};

export type SynthesisInput = {
  answers?: InterviewAnswers;
  /** Real posts, strongest signal available. Order is preserved; newest first is best. */
  samples?: string[];
  /** Merged over the model's output — the user's explicit edits always win. */
  overrides?: VoiceProfileEdit;
};

/**
 * The JSON Schema handed to Gemini's structured output.
 *
 * Written by hand rather than derived from the zod schema: the zod schema has
 * defaults and refinements that have no JSON Schema equivalent, and a generated
 * approximation that silently drifts from the validator is worse than two
 * explicit definitions that are checked against each other by `validate`.
 */
const voiceResponseSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    sliders: {
      type: "object",
      properties: {
        formality: { type: "integer" },
        energy: { type: "integer" },
        technicality: { type: "integer" },
        personal: { type: "integer" },
        humor: { type: "integer" },
        directness: { type: "integer" },
      },
      required: ["formality", "energy", "technicality", "personal", "humor", "directness"],
    },
    structure: {
      type: "object",
      properties: {
        hookStyle: { type: "string" },
        closingStyle: { type: "string" },
        usesLineBreaks: { type: "boolean" },
        usesEmoji: { type: "boolean" },
        usesHashtags: { type: "boolean" },
        targetWords: { type: "integer" },
      },
    },
    lexicon: { type: "array", items: { type: "string" } },
    taboo: { type: "array", items: { type: "string" } },
    grounding: { type: "array", items: { type: "string" } },
    exemplars: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "sliders"],
} as const;

/** Trims the sample set to the budget, oldest dropped first. */
function budgetedSamples(samples: string[]): string[] {
  const kept: string[] = [];
  let used = 0;

  for (const sample of samples) {
    const text = sample.trim();
    if (!text) continue;
    if (used + text.length > MAX_SAMPLE_CHARS) break;
    kept.push(text);
    used += text.length;
  }

  return kept;
}

/**
 * Asks a provider for a voice profile.
 *
 * Returns the typed AI failure unchanged rather than a profile, so every caller
 * has to decide what to do when the model is unavailable — which in practice
 * means "keep the previous profile and say so", never "save a neutral one".
 */
export async function synthesizeVoice(
  input: SynthesisInput,
  context: AiUsageContext = {}
): Promise<AiResult<VoiceProfileShape>> {
  const samples = budgetedSamples(input.samples ?? []);
  const transcript = input.answers ? transcriptFor(input.answers) : "";

  const result = await generateJson<unknown>(
    [
      { role: "system", content: SYNTHESIZE_VOICE_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          interview: transcript || undefined,
          posts: samples.length > 0 ? samples : undefined,
        }),
      },
    ],
    {
      // Shape is enforced by zod below rather than here: the model returns
      // partial objects often enough that rejecting them outright wastes a call
      // the defaults could have salvaged.
      validate: (value): value is unknown => typeof value === "object" && value !== null,
      schema: voiceResponseSchema as unknown as Record<string, unknown>,
      actionType: "synthesize_voice",
      context,
    }
  );

  if (!result.ok) return result;

  const parsed = parseVoiceProfile(result.value);
  const merged = input.overrides ? mergeProfile(parsed, input.overrides) : parsed;

  return { ...result, value: merged };
}

/**
 * Applies user edits on top of a generated profile.
 *
 * Arrays replace rather than concatenate: a user who deleted a phrase from their
 * lexicon means it should be gone, and a merge that unioned the two would keep
 * resurrecting it on every regeneration.
 */
export function mergeProfile(base: VoiceProfileShape, overrides: VoiceProfileEdit): VoiceProfileShape {
  return voiceProfileShapeSchema.parse({
    ...base,
    ...overrides,
    sliders: { ...base.sliders, ...(overrides.sliders ?? {}) },
    structure: { ...base.structure, ...(overrides.structure ?? {}) },
    perPlatform: { ...base.perPlatform, ...(overrides.perPlatform ?? {}) },
  });
}

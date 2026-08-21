import { z } from "zod";
import type { Platform } from "@/lib/types/db";

/**
 * The shape of `voice_profiles.profile`.
 *
 * The migration deliberately left this column as bare `jsonb` and named this
 * module as its owner ("Shape is owned by lib/voice"), so the schema never has
 * to migrate when the model of a voice changes. That freedom only works if
 * exactly one module defines and validates the shape — this one.
 *
 * Everything here is designed to survive a round trip through a language model:
 * the sliders are integers on a fixed scale rather than adjectives, because
 * "fairly casual" drifts between generations while a 3 does not, and the
 * lexicon lists are concrete strings the prompt can quote back verbatim.
 */

/** 1–5 on every axis. Odd-numbered so "no strong preference" is expressible. */
export const SLIDER_MIN = 1;
export const SLIDER_MAX = 5;

const slider = z.number().int().min(SLIDER_MIN).max(SLIDER_MAX);

/**
 * The axes a founder's writing actually varies on.
 *
 * Chosen to be things a reader could score blind from two sample posts. An axis
 * nobody can score consistently is noise that makes every generated post drift.
 */
export const voiceSlidersSchema = z.object({
  /** Buttoned-up (1) to conversational (5). */
  formality: slider,
  /** Measured (1) to emphatic (5) — exclamation, superlative, intensity. */
  energy: slider,
  /** Plain-spoken (1) to technical (5). Governs how much jargon survives editing. */
  technicality: slider,
  /** Impersonal (1) to first-person and anecdotal (5). */
  personal: slider,
  /** Earnest (1) to wry (5). Humour is the axis models overshoot most, so it is explicit. */
  humor: slider,
  /** Discursive (1) to blunt (5). Drives sentence length more than any other axis. */
  directness: slider,
});

export type VoiceSliders = z.infer<typeof voiceSlidersSchema>;

/** Neutral default: everything mid-scale. A profile with no signal yet should not lean anywhere. */
export const NEUTRAL_SLIDERS: VoiceSliders = {
  formality: 3,
  energy: 3,
  technicality: 3,
  personal: 3,
  humor: 2,
  directness: 3,
};

export const voiceStructureSchema = z.object({
  /** How a post opens: the pattern, not a fixed string. */
  hookStyle: z.string().max(280).default(""),
  /** How it closes — question, call to action, flat stop. */
  closingStyle: z.string().max(280).default(""),
  /** Whether line breaks are used as punctuation, which reads very differently per platform. */
  usesLineBreaks: z.boolean().default(true),
  usesEmoji: z.boolean().default(false),
  usesHashtags: z.boolean().default(false),
  /** Typical post length in words, as a soft target rather than a hard cap. */
  targetWords: z.number().int().min(10).max(1200).default(120),
});

export type VoiceStructure = z.infer<typeof voiceStructureSchema>;

/**
 * Per-platform deviations from the base voice.
 *
 * The same person is shorter and blunter on X than on LinkedIn, and a single
 * profile that averages the two sounds like neither. Every field is optional:
 * an absent override means "use the base voice unchanged".
 */
export const voicePlatformOverrideSchema = z.object({
  sliders: voiceSlidersSchema.partial().optional(),
  structure: voiceStructureSchema.partial().optional(),
  notes: z.string().max(600).optional(),
});

export type VoicePlatformOverride = z.infer<typeof voicePlatformOverrideSchema>;

export const voiceProfileShapeSchema = z.object({
  /** One or two sentences a human can sanity-check the whole profile against. */
  summary: z.string().max(600).default(""),
  sliders: voiceSlidersSchema.default(NEUTRAL_SLIDERS),
  structure: voiceStructureSchema.default(voiceStructureSchema.parse({})),
  /** Words and phrases this person actually reaches for. Quoted into the prompt verbatim. */
  lexicon: z.array(z.string().max(80)).max(60).default([]),
  /** Words to never use. Enforced as a post-generation check, not only as a request. */
  taboo: z.array(z.string().max(80)).max(60).default([]),
  /**
   * Stable facts the model may assert — company, role, product, numbers it is
   * allowed to cite. Anything not here is something it must not invent.
   */
  grounding: z.array(z.string().max(300)).max(40).default([]),
  /** Real posts that exemplify the voice. The strongest signal in the whole profile. */
  exemplars: z.array(z.string().max(3000)).max(20).default([]),
  perPlatform: z.record(z.string(), voicePlatformOverrideSchema).default({}),
});

export type VoiceProfileShape = z.infer<typeof voiceProfileShapeSchema>;

/** A fully-defaulted empty profile, used before any signal exists. */
export function emptyVoiceProfile(): VoiceProfileShape {
  return voiceProfileShapeSchema.parse({});
}

/**
 * Parses a `profile` column that may predate any given field.
 *
 * Never throws: a stored profile that fails validation is a display and
 * generation problem, not a reason to 500 a page, so an unparseable value
 * degrades to the neutral profile.
 */
export function parseVoiceProfile(value: unknown): VoiceProfileShape {
  const parsed = voiceProfileShapeSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : emptyVoiceProfile();
}

/**
 * Collapses the base voice and one platform's overrides into the voice that
 * platform should actually be written in.
 */
export function resolveForPlatform(profile: VoiceProfileShape, platform: Platform): VoiceProfileShape {
  const override = profile.perPlatform[platform];
  if (!override) return profile;

  return {
    ...profile,
    sliders: { ...profile.sliders, ...(override.sliders ?? {}) },
    structure: { ...profile.structure, ...(override.structure ?? {}) },
    summary: override.notes ? `${profile.summary}\n\n${platform}: ${override.notes}`.trim() : profile.summary,
  };
}

/** Human-readable ends of each slider, for both the UI labels and the prompt. */
export const SLIDER_LABELS: Record<keyof VoiceSliders, { low: string; high: string; label: string }> = {
  formality: { label: "Formality", low: "Buttoned-up", high: "Conversational" },
  energy: { label: "Energy", low: "Measured", high: "Emphatic" },
  technicality: { label: "Technicality", low: "Plain-spoken", high: "Technical" },
  personal: { label: "Personal", low: "Impersonal", high: "First-person" },
  humor: { label: "Humour", low: "Earnest", high: "Wry" },
  directness: { label: "Directness", low: "Discursive", high: "Blunt" },
};

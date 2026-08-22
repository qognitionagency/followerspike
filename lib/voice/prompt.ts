import { SLIDER_LABELS, type VoiceProfileShape, type VoiceSliders } from "@/lib/voice/types";

/**
 * Turning a voice profile into prompt text.
 *
 * Kept separate from both the profile shape and the generator so there is one
 * place to answer "what did the model actually get told about this person".
 * When a generated post sounds wrong, this rendering is the first thing to read.
 *
 * The sliders are the interesting part. They are stored as integers because a
 * number survives a round trip through a model where "fairly casual" drifts —
 * but a number is also meaningless *to* a model, so each value is rendered back
 * into an explicit instruction here. The scale is described in both directions
 * so a 1 is as legible as a 5.
 */

/** What each point on each axis actually asks for. Index 0 is a slider value of 1. */
const SLIDER_INSTRUCTIONS: Record<keyof VoiceSliders, [string, string, string, string, string]> = {
  formality: [
    "Write formally. Complete sentences, no contractions, no slang.",
    "Lean formal. Contractions are fine, slang is not.",
    "Neither stiff nor chatty. Plain professional register.",
    "Lean conversational. Write the way you would say it out loud.",
    "Fully conversational. Contractions, asides, and sentence fragments are all in character.",
  ],
  energy: [
    "Stay measured. No exclamation marks, no superlatives, no hype.",
    "Mostly measured. Understatement over emphasis.",
    "Even energy. Emphasise only where it is earned.",
    "Bring visible energy, but never manufactured excitement.",
    "Be emphatic. Strong claims and strong verbs, still without hype language.",
  ],
  technicality: [
    "Assume no domain knowledge. Explain every term.",
    "Assume a little context. Define anything specialised.",
    "Assume a working practitioner. Ordinary domain terms need no gloss.",
    "Assume an expert reader. Use precise technical language.",
    "Write for peers. Full technical depth, no simplification.",
  ],
  personal: [
    "Keep it impersonal. No first person, no anecdotes.",
    "Mostly impersonal. First person only where unavoidable.",
    "Mix observation with occasional first-person framing.",
    "Write in first person, grounded in your own experience.",
    "Lead with personal experience. Specific incidents over general claims.",
  ],
  humor: [
    "No humour. Play it entirely straight.",
    "Essentially earnest. A dry aside at most.",
    "Light dryness where it fits. Never a joke for its own sake.",
    "Wry throughout. Understated, never zany.",
    "Consistently wry and self-aware, without undercutting the point.",
  ],
  directness: [
    "Take your time. Build the context before the claim.",
    "Give some setup before arriving at the point.",
    "Reach the point at a normal pace.",
    "Be blunt. Lead with the claim, justify after.",
    "Maximum bluntness. Short sentences. The first line is the whole argument.",
  ],
};

function sliderLine(axis: keyof VoiceSliders, value: number): string {
  const meta = SLIDER_LABELS[axis];
  // Values are validated to 1–5 by the schema, but a stored profile is data and
  // this must not index out of bounds if that ever stops being true.
  const index = Math.min(Math.max(Math.round(value), 1), 5) - 1;
  return `- ${meta.label} (${value}/5, ${meta.low} → ${meta.high}): ${SLIDER_INSTRUCTIONS[axis][index]}`;
}

/**
 * The voice as a block of instructions.
 *
 * Sections with nothing in them are omitted entirely rather than emitted empty.
 * An empty "Never use: " line reads to a model as a constraint it should invent
 * content for, and models oblige.
 */
export function renderVoiceInstructions(profile: VoiceProfileShape): string {
  const parts: string[] = [];

  if (profile.summary) {
    parts.push(`How this person writes:\n${profile.summary}`);
  }

  const axes = (Object.keys(SLIDER_INSTRUCTIONS) as Array<keyof VoiceSliders>)
    .map((axis) => sliderLine(axis, profile.sliders[axis]))
    .join("\n");
  parts.push(`Style dials:\n${axes}`);

  const structure = profile.structure;
  const structureLines = [
    structure.hookStyle ? `- Opens like this: ${structure.hookStyle}` : null,
    structure.closingStyle ? `- Closes like this: ${structure.closingStyle}` : null,
    `- Line breaks as punctuation: ${structure.usesLineBreaks ? "yes" : "no"}`,
    `- Emoji: ${structure.usesEmoji ? "occasionally, as they do" : "never"}`,
    `- Hashtags: ${structure.usesHashtags ? "a small number, as they do" : "never"}`,
    `- Target length: about ${structure.targetWords} words. This is a target, not a limit.`,
  ].filter(Boolean);
  parts.push(`Structure:\n${structureLines.join("\n")}`);

  if (profile.lexicon.length > 0) {
    parts.push(
      `Words and phrases they actually use. Reach for these where they fit naturally; do not force every one in:\n${profile.lexicon
        .map((word) => `- ${word}`)
        .join("\n")}`
    );
  }

  if (profile.taboo.length > 0) {
    parts.push(
      `Never use these words or phrases, in any form:\n${profile.taboo.map((word) => `- ${word}`).join("\n")}`
    );
  }

  if (profile.grounding.length > 0) {
    parts.push(
      `The only facts you may state about them. Anything not on this list must not appear, ` +
        `including numbers, customers, funding, and job titles:\n${profile.grounding
          .map((fact) => `- ${fact}`)
          .join("\n")}`
    );
  }

  return parts.join("\n\n");
}

/**
 * Exemplars, labelled as style evidence rather than source material.
 *
 * The label matters more than it looks: handed a batch of the user's real posts
 * with no framing, models summarise or remix them, and the output reads as a
 * rehash of something already published.
 */
export function renderExemplars(exemplars: string[]): string {
  if (exemplars.length === 0) return "";

  const body = exemplars
    .map((text, index) => `Example ${index + 1}:\n"""\n${text}\n"""`)
    .join("\n\n");

  return (
    `Posts this person has actually written. Copy the VOICE: rhythm, sentence length, ` +
    `how they open and close. Do not reuse their subject matter, phrasing, or examples:\n\n${body}`
  );
}

/**
 * Past corrections, rendered as before/after pairs.
 *
 * This is the only signal that says what the model got *wrong*, which no number
 * of exemplars provides — an exemplar shows a good post, an edit shows the exact
 * distance between what was generated and what the person was willing to publish.
 */
export function renderCorrections(edits: Array<{ generated: string; edited: string }>): string {
  if (edits.length === 0) return "";

  const body = edits
    .map(
      (edit, index) =>
        `Correction ${index + 1}\nYou wrote:\n"""\n${edit.generated}\n"""\nThey rewrote it as:\n"""\n${edit.edited}\n"""`
    )
    .join("\n\n");

  return (
    `Drafts you produced before and how this person changed them. The edits are the ` +
    `strongest signal you have about what you are getting wrong. Do not repeat the ` +
    `patterns they removed:\n\n${body}`
  );
}

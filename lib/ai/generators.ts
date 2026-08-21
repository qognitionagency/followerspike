import { z } from "zod";
import {
  ANALYZE_BRAND_TONE_PROMPT,
  AUDIT_PROFILE_PROMPT,
  GENERATE_COMMENT_PROMPT,
  GENERATE_POST_PROMPT,
  SCORE_RELEVANCE_PROMPT,
} from "@/lib/ai/prompts";
import { generateJson, withFallback, type AiResult, type JsonSchema } from "@/lib/ai/client";
import type { AiUsageContext } from "@/lib/ai/usage";
import type { AuditResult, JsonObject, UserProfile } from "@/lib/types";

export const linkedinUrlSchema = z
  .string()
  .url()
  .refine((url) => /(^|\.)linkedin\.com$/i.test(new URL(url).hostname.replace(/^www\./, "")), {
    message: "Enter a valid LinkedIn URL",
  });

export type ProfileData = {
  linkedinUrl: string;
  headline?: string;
  about?: string;
  posts?: string[];
  experience?: string[];
  education?: string[];
  hasImage?: boolean;
  goal?: string;
};

type BrandVoice = JsonObject & {
  tone_axes?: JsonObject;
  sparse_profile?: boolean;
};

type GeneratedPost = {
  content: string;
  rationale: string;
};

type GeneratedComment = {
  comment: string;
};

type RelevanceScore = {
  score: number;
  reason: string;
};

const auditResultSchema = z.object({
  score: z.number().min(0).max(100),
  isEmptyProfile: z.boolean(),
  summary: z.string().min(1),
  headlineSuggestion: z.string().min(1),
  aboutSuggestion: z.string().min(1),
  photoBannerChecklist: z.array(z.string()),
  keywordGaps: z.array(z.string()),
  contentPlan: z.array(z.string()),
  riskFlags: z.array(z.string()),
});

const generatedPostSchema = z.object({
  content: z.string().min(1),
  rationale: z.string().min(1),
});

const generatedCommentSchema = z.object({
  comment: z.string().min(1),
});

const relevanceScoreSchema = z.object({
  score: z.number().min(0).max(10),
  reason: z.string().min(1),
});

const stringArraySchema = {
  type: "array",
  items: { type: "string" },
} satisfies JsonSchema;

const auditResponseSchema = {
  type: "object",
  properties: {
    score: { type: "number", minimum: 0, maximum: 100 },
    isEmptyProfile: { type: "boolean" },
    summary: { type: "string" },
    headlineSuggestion: { type: "string" },
    aboutSuggestion: { type: "string" },
    photoBannerChecklist: stringArraySchema,
    keywordGaps: stringArraySchema,
    contentPlan: stringArraySchema,
    riskFlags: stringArraySchema,
  },
  required: [
    "score",
    "isEmptyProfile",
    "summary",
    "headlineSuggestion",
    "aboutSuggestion",
    "photoBannerChecklist",
    "keywordGaps",
    "contentPlan",
    "riskFlags",
  ],
  propertyOrdering: [
    "score",
    "isEmptyProfile",
    "summary",
    "headlineSuggestion",
    "aboutSuggestion",
    "photoBannerChecklist",
    "keywordGaps",
    "contentPlan",
    "riskFlags",
  ],
} satisfies JsonSchema;

const generatedPostResponseSchema = {
  type: "object",
  properties: {
    content: { type: "string" },
    rationale: { type: "string" },
  },
  required: ["content", "rationale"],
} satisfies JsonSchema;

const generatedCommentResponseSchema = {
  type: "object",
  properties: {
    comment: { type: "string" },
  },
  required: ["comment"],
} satisfies JsonSchema;

const relevanceResponseSchema = {
  type: "object",
  properties: {
    score: { type: "number", minimum: 0, maximum: 10 },
    reason: { type: "string" },
  },
  required: ["score", "reason"],
} satisfies JsonSchema;

function isAuditResult(value: unknown): value is AuditResult {
  return auditResultSchema.safeParse(value).success;
}

function isGeneratedPost(value: unknown): value is GeneratedPost {
  return generatedPostSchema.safeParse(value).success;
}

function isGeneratedComment(value: unknown): value is GeneratedComment {
  return generatedCommentSchema.safeParse(value).success;
}

function isRelevanceScore(value: unknown): value is RelevanceScore {
  return relevanceScoreSchema.safeParse(value).success;
}

export function isEmptyLinkedInProfile(profile: ProfileData): boolean {
  return (
    !profile.headline &&
    !profile.about &&
    !profile.hasImage &&
    (!profile.posts || profile.posts.length === 0) &&
    (!profile.experience || profile.experience.length === 0) &&
    (!profile.education || profile.education.length === 0)
  );
}

function emptyProfileFallback(linkedinUrl: string, goal?: string): AuditResult {
  const audience = goal || "generate founder-led opportunities";
  return {
    score: 12,
    isEmptyProfile: true,
    summary:
      "This profile has too little public signal to convert visitors today. The fastest win is to build the foundation: photo, headline, about section, proof, and a simple posting rhythm.",
    headlineSuggestion: `Founder helping ${audience} | Building in public | Open to relevant conversations`,
    aboutSuggestion:
      "I help a specific audience solve a specific business problem. My work sits at the intersection of strategy, execution, and consistent distribution. Follow for practical notes on what I am building, learning, and testing.",
    photoBannerChecklist: [
      "Add a clear face-forward profile photo with a simple background.",
      "Add a banner with your category, outcome, and one proof point.",
      "Use the featured section for one case study, offer, or proof asset.",
    ],
    keywordGaps: ["Founder", "B2B", "LinkedIn growth", "Go-to-market", "Consulting"],
    contentPlan: [
      "Day 1: Why you are building or repositioning your profile now.",
      "Day 2: A customer problem you keep seeing.",
      "Day 3: A lesson from a recent mistake.",
      "Day 4: A simple framework your audience can use.",
      "Day 5: A short founder story with a specific takeaway.",
      "Day 6: A contrarian take about your industry.",
      "Day 7: A soft CTA asking who else is solving this problem.",
    ],
    riskFlags: ["No public profile signal", "No profile photo detected", "No recent posts detected"],
  };
}

/**
 * The only user fields a prompt is allowed to see.
 *
 * Routes used to hand the model `session.profile` — the whole users row, plus
 * the account's email address — as "context". None of the prompts in
 * `lib/ai/prompts.ts` ask for an identity; they ask for a niche, an ICP, and a
 * voice. Everything else (email, limits, admin flag, consent timestamps,
 * autopilot state) was leaked for nothing.
 */
export function promptUserContext(profile: Pick<UserProfile, "niche" | "icp_description" | "brand_voice">): JsonObject {
  return {
    niche: profile.niche,
    icp_description: profile.icp_description,
    brand_voice: profile.brand_voice,
  };
}

/** Canned audit used only by the call sites that explicitly opt into a fallback. */
function auditFallback(profile: ProfileData): AuditResult {
  const emptyFallback = emptyProfileFallback(profile.linkedinUrl, profile.goal);
  return isEmptyLinkedInProfile(profile)
    ? emptyFallback
    : {
        ...emptyFallback,
        score: 64,
        isEmptyProfile: false,
        summary:
          "The profile has usable signal, but it needs a sharper positioning line, stronger proof, and a posting rhythm tied to a clear commercial audience.",
        riskFlags: ["Positioning can be sharper", "Proof could be easier to find"],
      };
}

export async function auditProfileResult(
  profile: ProfileData,
  context: AiUsageContext = {}
): Promise<AiResult<AuditResult>> {
  return generateJson<AuditResult>(
    [
      { role: "system", content: AUDIT_PROFILE_PROMPT },
      { role: "user", content: JSON.stringify(profile) },
    ],
    { validate: isAuditResult, schema: auditResponseSchema, actionType: "audit_profile", context }
  );
}

/** Fallback wrapper — see the note on the re-exports at the bottom of this file. */
export async function auditProfileOrFallback(profile: ProfileData, context: AiUsageContext = {}): Promise<AuditResult> {
  return withFallback(await auditProfileResult(profile, context), auditFallback(profile));
}

function brandVoiceFallback(profile: ProfileData): BrandVoice {
  return {
    sparse_profile: isEmptyLinkedInProfile(profile),
    tone_axes: {
      formal_to_casual: 0.55,
      data_to_story: 0.45,
      concise_to_expansive: 0.35,
      humble_to_bold: 0.55,
    },
    signature_phrases: ["Here is the thing"],
    topics: ["founder lessons", "go-to-market", "LinkedIn growth"],
    avoid: ["fake metrics", "empty hustle language", "generic AI phrasing"],
    post_structure: "direct hook -> useful observation -> specific takeaway -> question",
    emoji_usage: "minimal",
    hashtag_style: "0-2 lowercase hashtags",
    example_opener: "Most founders do not have a content problem. They have a consistency problem.",
    audience_perception: "practical founder building a sharper professional presence",
    // Marks the stored voice as not model-derived, so a later pass can redo it.
    generated: false,
  };
}

export async function analyzeBrandToneResult(
  profile: ProfileData,
  context: AiUsageContext = {}
): Promise<AiResult<BrandVoice>> {
  return generateJson<BrandVoice>(
    [
      { role: "system", content: ANALYZE_BRAND_TONE_PROMPT },
      { role: "user", content: JSON.stringify(profile) },
    ],
    {
      validate: (value): value is BrandVoice => typeof value === "object" && value !== null,
      schema: { type: "object", additionalProperties: true },
      actionType: "analyze_brand_tone",
      context,
    }
  );
}

/** Fallback wrapper — see the note on the re-exports at the bottom of this file. */
export async function analyzeBrandToneOrFallback(
  profile: ProfileData,
  context: AiUsageContext = {}
): Promise<BrandVoice> {
  return withFallback(await analyzeBrandToneResult(profile, context), brandVoiceFallback(profile));
}

/**
 * Labelled as canned in the rationale, and never written to a post without the
 * call site choosing it — an automated job that published this under a real
 * name would be putting words in someone's mouth.
 */
const POST_FALLBACK: GeneratedPost = {
  content:
    "Most founders do not need more content ideas. They need a repeatable way to show up when the calendar gets loud.\n\nOne useful post. One thoughtful comment. One relevant connection.\n\nDone daily, that compounds faster than another weekend spent rewriting a content strategy.\n\nWhat part of LinkedIn do you avoid the most?",
  rationale: "Fallback post used because live AI was unavailable. Not generated for this request.",
};

export async function generatePostResult(
  userContext: JsonObject,
  topicSeed: string,
  context: AiUsageContext = {}
): Promise<AiResult<GeneratedPost>> {
  return generateJson<GeneratedPost>(
    [
      { role: "system", content: GENERATE_POST_PROMPT },
      { role: "user", content: JSON.stringify({ user: userContext, topicSeed }) },
    ],
    { validate: isGeneratedPost, schema: generatedPostResponseSchema, actionType: "generate_post", context }
  );
}

/** Fallback wrapper — see the note on the re-exports at the bottom of this file. */
export async function generatePostOrFallback(
  userContext: JsonObject,
  topicSeed: string,
  context: AiUsageContext = {}
): Promise<GeneratedPost> {
  return withFallback(await generatePostResult(userContext, topicSeed, context), POST_FALLBACK);
}

const COMMENT_FALLBACK: GeneratedComment = {
  comment:
    "This is the part most teams underestimate: consistency only works when the message is specific enough to attract the right people.",
};

export async function generateCommentResult(
  userContext: JsonObject,
  targetPost: string,
  context: AiUsageContext = {}
): Promise<AiResult<GeneratedComment>> {
  return generateJson<GeneratedComment>(
    [
      { role: "system", content: GENERATE_COMMENT_PROMPT },
      { role: "user", content: JSON.stringify({ user: userContext, targetPost }) },
    ],
    { validate: isGeneratedComment, schema: generatedCommentResponseSchema, actionType: "generate_comment", context }
  );
}

/** Fallback wrapper — see the note on the re-exports at the bottom of this file. */
export async function generateCommentOrFallback(
  userContext: JsonObject,
  targetPost: string,
  context: AiUsageContext = {}
): Promise<GeneratedComment> {
  return withFallback(await generateCommentResult(userContext, targetPost, context), COMMENT_FALLBACK);
}

/**
 * Fails closed at 0, not at 7.
 *
 * SCORE_RELEVANCE_PROMPT says "only scores 7 or higher should be acted on", and
 * the old fallback returned exactly 7 — so an outage made every post on earth
 * look worth engaging with, which is the one behaviour an automated engagement
 * job must never inherit from a failure.
 */
const RELEVANCE_FALLBACK: RelevanceScore = {
  score: 0,
  reason: "AI scoring was unavailable, so this post is scored as not actionable rather than assumed relevant.",
};

export async function scoreRelevanceResult(
  userContext: JsonObject,
  targetPost: string,
  context: AiUsageContext = {}
): Promise<AiResult<RelevanceScore>> {
  return generateJson<RelevanceScore>(
    [
      { role: "system", content: SCORE_RELEVANCE_PROMPT },
      { role: "user", content: JSON.stringify({ user: userContext, targetPost }) },
    ],
    { validate: isRelevanceScore, schema: relevanceResponseSchema, actionType: "score_relevance", context }
  );
}

/** Fallback wrapper — see the note on the re-exports at the bottom of this file. */
export async function scoreRelevanceOrFallback(
  userContext: JsonObject,
  targetPost: string,
  context: AiUsageContext = {}
): Promise<RelevanceScore> {
  return withFallback(await scoreRelevanceResult(userContext, targetPost, context), RELEVANCE_FALLBACK);
}

/**
 * Back-compatible aliases for the fallback wrappers.
 *
 * The marketing pages and free tools (`lib/marketing/free-tools.ts`,
 * `app/(marketing)/tools/linkedin-audit`, `app/(app)/app/voice`) import these
 * short names and genuinely do want to degrade rather than error. The `...OrFallback`
 * names above say what they do; new code — anything that queues, publishes, or
 * scores on a user's behalf — should call the `...Result` functions and branch
 * on `ok` instead.
 */
export {
  auditProfileOrFallback as auditProfile,
  analyzeBrandToneOrFallback as analyzeBrandTone,
  generatePostOrFallback as generatePost,
  generateCommentOrFallback as generateComment,
  scoreRelevanceOrFallback as scoreRelevance,
};

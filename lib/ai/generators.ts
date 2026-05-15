import { z } from "zod";
import {
  ANALYZE_BRAND_TONE_PROMPT,
  AUDIT_PROFILE_PROMPT,
  GENERATE_COMMENT_PROMPT,
  GENERATE_POST_PROMPT,
  SCORE_RELEVANCE_PROMPT,
} from "@/lib/ai/prompts";
import { generateJson, type JsonSchema } from "@/lib/ai/client";
import type { AuditResult, JsonObject } from "@/lib/types";

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

export async function auditProfile(profile: ProfileData): Promise<AuditResult> {
  const emptyFallback = emptyProfileFallback(profile.linkedinUrl, profile.goal);
  const fallback = isEmptyLinkedInProfile(profile)
    ? emptyFallback
    : {
        ...emptyFallback,
        score: 64,
        isEmptyProfile: false,
        summary:
          "The profile has usable signal, but it needs a sharper positioning line, stronger proof, and a posting rhythm tied to a clear commercial audience.",
        riskFlags: ["Positioning can be sharper", "Proof could be easier to find"],
      };

  return generateJson<AuditResult>(
    [
      { role: "system", content: AUDIT_PROFILE_PROMPT },
      { role: "user", content: JSON.stringify(profile) },
    ],
    fallback,
    isAuditResult,
    auditResponseSchema
  );
}

export async function analyzeBrandTone(profile: ProfileData): Promise<BrandVoice> {
  return generateJson<BrandVoice>(
    [
      { role: "system", content: ANALYZE_BRAND_TONE_PROMPT },
      { role: "user", content: JSON.stringify(profile) },
    ],
    {
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
    },
    (value): value is BrandVoice => typeof value === "object" && value !== null,
    {
      type: "object",
      additionalProperties: true,
    }
  );
}

export async function generatePost(userContext: JsonObject, topicSeed: string): Promise<GeneratedPost> {
  return generateJson<GeneratedPost>(
    [
      { role: "system", content: GENERATE_POST_PROMPT },
      { role: "user", content: JSON.stringify({ user: userContext, topicSeed }) },
    ],
    {
      content:
        "Most founders do not need more content ideas. They need a repeatable way to show up when the calendar gets loud.\n\nOne useful post. One thoughtful comment. One relevant connection.\n\nDone daily, that compounds faster than another weekend spent rewriting a content strategy.\n\nWhat part of LinkedIn do you avoid the most?",
      rationale: "Fallback post used because live AI was unavailable.",
    },
    isGeneratedPost,
    generatedPostResponseSchema
  );
}

export async function generateComment(userContext: JsonObject, targetPost: string): Promise<GeneratedComment> {
  return generateJson<GeneratedComment>(
    [
      { role: "system", content: GENERATE_COMMENT_PROMPT },
      { role: "user", content: JSON.stringify({ user: userContext, targetPost }) },
    ],
    {
      comment:
        "This is the part most teams underestimate: consistency only works when the message is specific enough to attract the right people.",
    },
    isGeneratedComment,
    generatedCommentResponseSchema
  );
}

export async function scoreRelevance(userContext: JsonObject, targetPost: string): Promise<RelevanceScore> {
  return generateJson<RelevanceScore>(
    [
      { role: "system", content: SCORE_RELEVANCE_PROMPT },
      { role: "user", content: JSON.stringify({ user: userContext, targetPost }) },
    ],
    { score: 7, reason: "Fallback score used because AI scoring was unavailable." },
    isRelevanceScore,
    relevanceResponseSchema
  );
}

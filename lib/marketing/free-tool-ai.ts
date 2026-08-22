/**
 * The generative half of the free tools.
 *
 * Six of the ten public tools promise generated output and returned a template.
 * `runFreeTool` did have AI branches, but every one of them keyed off a slug
 * from the retired LinkedIn product: `linkedin-post-generator`,
 * `connection-note-generator`, and eight more that no page has linked to since
 * the pivot. The tools that actually exist fell straight through to
 * `deterministicToolResult`, so a visitor asking for a rewritten post got a
 * generic positioning checklist, with a 200 and no way to tell.
 *
 * Each generator below is keyed to a slug that is really in `freeTools`, and
 * each declares the shape it wants back so a malformed answer is a failure
 * rather than a half-rendered result.
 *
 * Failure is reported, never disguised. These run for people who have not
 * signed up, so a hard error page would be the wrong response, but so would
 * quietly serving a template as though a model had written it. `aiUnavailable`
 * says plainly that the generator could not run.
 */
import { generateJson, type AiResult } from "@/lib/ai/client";
import type { FreeToolResult, FreeToolSection } from "@/lib/marketing/content";

/** X's ceiling for a standard account, and Bluesky's, so the model writes to fit. */
const X_LIMIT = 280;
const BLUESKY_LIMIT = 300;
const LINKEDIN_HEADLINE_LIMIT = 220;

type ToolInput = { primaryText: string; context?: string };

/** Shown when the model could not be reached, instead of a template pretending otherwise. */
export function aiUnavailable(cta: string): FreeToolResult {
  return {
    title: "We could not generate this right now.",
    summary:
      "The writing model did not answer. Nothing was saved, and nothing below was invented to fill the gap. Try again in a minute.",
    sections: [],
    cta,
  };
}

const str = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const strArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every(str);

/** Trims a model's list to something a results page can show without scrolling forever. */
function take(items: string[], limit: number): string[] {
  return items.slice(0, limit).map((item) => item.trim());
}

// ---------------------------------------------------------------------------
// founder-voice-finder
// ---------------------------------------------------------------------------

type VoiceOut = { summary: string; cadence: string; hooks: string[]; avoid: string[] };

async function founderVoiceFinder(input: ToolInput, cta: string): Promise<FreeToolResult> {
  const result = await generateJson<VoiceOut>(
    [
      {
        role: "system",
        content:
          "You describe how a founder already writes, from one sentence of their own words. " +
          "Return JSON: summary (2 sentences on their voice), cadence (1 sentence on sentence length and rhythm), " +
          "hooks (4 opening lines in their voice, each under 90 characters), " +
          "avoid (5 words or phrases that would sound nothing like them). " +
          "Never use em dashes. Never use marketing cliches such as unleash, supercharge, game-changer, or effortless.",
      },
      {
        role: "user",
        content: JSON.stringify({ theyBuild: input.primaryText, audience: input.context || undefined }),
      },
    ],
    {
      actionType: "free_tool_voice_finder",
      validate: (v): v is VoiceOut => {
        const o = v as VoiceOut;
        return Boolean(o) && str(o.summary) && str(o.cadence) && strArray(o.hooks) && strArray(o.avoid);
      },
    }
  );

  if (!result.ok) return aiUnavailable(cta);
  const v = result.value;

  return {
    title: "Here is how you already sound.",
    summary: v.summary,
    sections: [
      { title: "Your cadence", body: v.cadence },
      { title: "Openings in your voice", body: "Use these as starting lines, not templates.", items: take(v.hooks, 4) },
      { title: "Never let AI say these for you", body: "None of these sound like you.", items: take(v.avoid, 5) },
    ],
    cta,
  };
}

// ---------------------------------------------------------------------------
// cross-post-rewriter
// ---------------------------------------------------------------------------

type RewriteOut = { x: string; bluesky: string; linkedin: string; note: string };

async function crossPostRewriter(input: ToolInput, cta: string): Promise<FreeToolResult> {
  const result = await generateJson<RewriteOut>(
    [
      {
        role: "system",
        content:
          `Rewrite one post natively for three platforms. Return JSON with x, bluesky, linkedin, and note. ` +
          `x must be at most ${X_LIMIT} characters. bluesky at most ${BLUESKY_LIMIT}. ` +
          `linkedin can be longer and should use short paragraphs with line breaks. ` +
          `Keep the author's own wording wherever it already fits. Adapt, do not translate: ` +
          `X rewards a tight first line, Bluesky tolerates more personality, LinkedIn expects context before the point. ` +
          `note is one sentence on what you changed and why. Never use em dashes or hashtags.`,
      },
      {
        role: "user",
        content: JSON.stringify({ post: input.primaryText, writtenFor: input.context || undefined }),
      },
    ],
    {
      actionType: "free_tool_cross_post",
      validate: (v): v is RewriteOut => {
        const o = v as RewriteOut;
        return Boolean(o) && str(o.x) && str(o.bluesky) && str(o.linkedin) && str(o.note);
      },
    }
  );

  if (!result.ok) return aiUnavailable(cta);
  const v = result.value;

  // Reported rather than silently trimmed: a truncated post is the model's
  // mistake to see, not something to paper over on the way to the page.
  const overLimit: string[] = [];
  if (v.x.length > X_LIMIT) overLimit.push(`X version is ${v.x.length} of ${X_LIMIT} characters`);
  if (v.bluesky.length > BLUESKY_LIMIT) overLimit.push(`Bluesky version is ${v.bluesky.length} of ${BLUESKY_LIMIT}`);

  const sections: FreeToolSection[] = [
    { title: `X (${v.x.length}/${X_LIMIT})`, body: v.x },
    { title: `Bluesky (${v.bluesky.length}/${BLUESKY_LIMIT})`, body: v.bluesky },
    { title: "LinkedIn", body: v.linkedin },
    { title: "What changed", body: v.note },
  ];
  if (overLimit.length > 0) {
    sections.push({ title: "Over the limit", body: "Trim these before posting.", items: overLimit });
  }

  return { title: "Three native versions, not three copies.", summary: v.note, sections, cta };
}

// ---------------------------------------------------------------------------
// hook-analyzer
// ---------------------------------------------------------------------------

type HookOut = { score: number; verdict: string; problems: string[]; rewrites: string[] };

async function hookAnalyzer(input: ToolInput, cta: string): Promise<FreeToolResult> {
  const result = await generateJson<HookOut>(
    [
      {
        role: "system",
        content:
          "Judge whether an opening line earns the second line. Return JSON: score (integer 0 to 100), " +
          "verdict (1 sentence, direct, no flattery), problems (2 to 4 specific faults), " +
          "rewrites (5 sharper versions, each under 90 characters, each a different angle). " +
          "Score honestly: a vague or self-congratulatory opener should score below 40. " +
          "Never use em dashes.",
      },
      {
        role: "user",
        content: JSON.stringify({ openingLine: input.primaryText, audience: input.context || undefined }),
      },
    ],
    {
      actionType: "free_tool_hook",
      validate: (v): v is HookOut => {
        const o = v as HookOut;
        return (
          Boolean(o) &&
          typeof o.score === "number" &&
          Number.isFinite(o.score) &&
          str(o.verdict) &&
          strArray(o.problems) &&
          strArray(o.rewrites)
        );
      },
    }
  );

  if (!result.ok) return aiUnavailable(cta);
  const v = result.value;

  return {
    title: `Your hook scores ${Math.max(0, Math.min(100, Math.round(v.score)))}/100.`,
    score: Math.max(0, Math.min(100, Math.round(v.score))),
    summary: v.verdict,
    sections: [
      { title: "What is holding it back", body: "Each of these costs you readers.", items: take(v.problems, 4) },
      { title: "Five sharper openings", body: "Different angles, not rewordings.", items: take(v.rewrites, 5) },
    ],
    cta,
  };
}

// ---------------------------------------------------------------------------
// founder-bio-generator
// ---------------------------------------------------------------------------

type BioOut = { x: string; bluesky: string; linkedinHeadline: string; rationale: string };

async function founderBioGenerator(input: ToolInput, cta: string): Promise<FreeToolResult> {
  const result = await generateJson<BioOut>(
    [
      {
        role: "system",
        content:
          `Write one founder's bio for three platforms. Return JSON with x, bluesky, linkedinHeadline, rationale. ` +
          `x at most 160 characters. bluesky at most 256. linkedinHeadline at most ${LINKEDIN_HEADLINE_LIMIT}. ` +
          `Each must name who they help and what changes, not just a job title. ` +
          `Use any proof given, verbatim, and never invent a number, customer count, or credential. ` +
          `rationale is one sentence. Never use em dashes or hashtags.`,
      },
      {
        role: "user",
        content: JSON.stringify({ whatTheyDo: input.primaryText, proof: input.context || undefined }),
      },
    ],
    {
      actionType: "free_tool_bio",
      validate: (v): v is BioOut => {
        const o = v as BioOut;
        return Boolean(o) && str(o.x) && str(o.bluesky) && str(o.linkedinHeadline) && str(o.rationale);
      },
    }
  );

  if (!result.ok) return aiUnavailable(cta);
  const v = result.value;

  return {
    title: "Three bios, one positioning.",
    summary: v.rationale,
    sections: [
      { title: `X bio (${v.x.length}/160)`, body: v.x },
      { title: `Bluesky bio (${v.bluesky.length}/256)`, body: v.bluesky },
      {
        title: `LinkedIn headline (${v.linkedinHeadline.length}/${LINKEDIN_HEADLINE_LIMIT})`,
        body: v.linkedinHeadline,
      },
    ],
    cta,
  };
}

// ---------------------------------------------------------------------------
// lead-magnet-post-writer
// ---------------------------------------------------------------------------

type LeadOut = { keyword: string; post: string; email: string; note: string };

async function leadMagnetPostWriter(input: ToolInput, cta: string): Promise<FreeToolResult> {
  const result = await generateJson<LeadOut>(
    [
      {
        role: "system",
        content:
          "Write a keyword opt-in post and the email it triggers. Return JSON: keyword (one uppercase word), " +
          "post (a short post ending by asking the reader to reply with that keyword and their email address), " +
          "email (the message sent to whoever asks, warm and brief, delivering the resource), " +
          "note (one sentence on why it is worded that way). " +
          "The post must give something useful before it asks for anything. " +
          "Delivery is by email only, so never mention a DM or direct message. " +
          "Never use em dashes or hashtags.",
      },
      {
        role: "user",
        content: JSON.stringify({ giveaway: input.primaryText, audience: input.context || undefined }),
      },
    ],
    {
      actionType: "free_tool_lead_magnet",
      validate: (v): v is LeadOut => {
        const o = v as LeadOut;
        return Boolean(o) && str(o.keyword) && str(o.post) && str(o.email) && str(o.note);
      },
    }
  );

  if (!result.ok) return aiUnavailable(cta);
  const v = result.value;

  return {
    title: `Ask them to reply with ${v.keyword.toUpperCase()}.`,
    summary: v.note,
    sections: [
      { title: "The post", body: v.post },
      { title: "The email it triggers", body: v.email },
      {
        title: "How it runs",
        body: "FollowerSpike watches the replies on your own post for that keyword and emails the resource to the address in the reply. Nobody is messaged who did not ask.",
      },
    ],
    cta,
  };
}

// ---------------------------------------------------------------------------
// founder-content-calendar
// ---------------------------------------------------------------------------

/**
 * A day, however the model chose to encode it.
 *
 * Asked for seven strings, it usually returns seven strings and sometimes seven
 * objects carrying the same four facts. Both are answers to the question, so
 * both are accepted and normalised here rather than one of them being failed.
 * This is not inventing content: nothing is added, the fields are only joined.
 */
function asDayLine(value: unknown): string | null {
  if (str(value)) return value.trim();
  if (typeof value !== "object" || value === null) return null;

  const o = value as Record<string, unknown>;
  const parts = [o.day, o.platform, o.angle].filter(str).map((p) => p.trim());
  if (parts.length === 0) return null;

  const opener = str(o.opener) ? ` "${o.opener.trim()}"` : "";
  return `${parts.join(", ")}${opener}`;
}

type CalendarOut = { summary: string; days: string[] };

/**
 * Seven angles, asked for as flat strings rather than objects.
 *
 * The first version of this wanted `days` as seven objects of four fields, and
 * the model kept returning JSON with a closing brace missing from the nested
 * array. `finish_reason` was `stop`, so nothing was truncated: it simply got
 * the nesting wrong, and one dropped brace fails the whole parse. A flat array
 * of strings has almost nothing to get wrong, and the page joined the four
 * fields into one line anyway.
 */
async function founderContentCalendar(input: ToolInput, cta: string): Promise<FreeToolResult> {
  const result = await generateJson<CalendarOut>(
    [
      {
        role: "system",
        content:
          "Plan seven posts from what a founder is actually working on. " +
          "Return JSON with exactly two keys: summary, a single sentence, and days, an array of exactly 7 strings. " +
          'Each string must read "Day, Platform, the angle, then the opening line in quotes". ' +
          "For example: Monday, X, what broke in the redesign, \"The nav took three weeks and I changed my mind twice.\" " +
          "Platform must be X, LinkedIn, or Bluesky, chosen to suit the angle: build-in-public detail suits X and Bluesky, " +
          "a lesson or a hiring note suits LinkedIn. Seven different angles, not one idea seven ways. " +
          "Never use em dashes or hashtags. Return the JSON object and nothing else.",
      },
      {
        role: "user",
        content: JSON.stringify({ workingOn: input.primaryText, audience: input.context || undefined }),
      },
    ],
    {
      actionType: "free_tool_calendar",
      validate: (v): v is CalendarOut => {
        const o = v as { summary?: unknown; days?: unknown };
        if (!o || !str(o.summary) || !Array.isArray(o.days) || o.days.length === 0) return false;

        const lines = o.days.map(asDayLine).filter(str);
        if (lines.length === 0) return false;

        // Rewritten in place so the caller receives the normalised form.
        (o as unknown as CalendarOut).days = lines;
        return true;
      },
    }
  );

  if (!result.ok) return aiUnavailable(cta);
  const v = result.value;

  return {
    title: "A week of posts, mapped to platforms.",
    summary: v.summary,
    sections: [
      {
        title: "Your week",
        body: "Each angle is placed on the platform it belongs on.",
        items: take(v.days, 7),
      },
    ],
    cta,
  };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

type Generator = (input: ToolInput, cta: string) => Promise<FreeToolResult>;

/**
 * Slug to generator. Every key here is a slug that really exists in `freeTools`;
 * that correspondence is asserted by an e2e test, because the previous set of
 * branches drifted away from the tool list without anything noticing.
 */
export const AI_FREE_TOOLS: Record<string, Generator> = {
  "founder-voice-finder": founderVoiceFinder,
  "cross-post-rewriter": crossPostRewriter,
  "hook-analyzer": hookAnalyzer,
  "founder-bio-generator": founderBioGenerator,
  "lead-magnet-post-writer": leadMagnetPostWriter,
  "founder-content-calendar": founderContentCalendar,
};

export function aiGeneratorFor(slug: string): Generator | null {
  return AI_FREE_TOOLS[slug] ?? null;
}

export type { AiResult };

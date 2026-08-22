import { z } from "zod";
import { auditProfile, generateComment, generatePost, linkedinUrlSchema, scoreRelevance } from "@/lib/ai/generators";
import { getFreeTool, type FreeToolResult, type FreeToolSection } from "@/lib/marketing/content";
import { BlueskyNotFoundError } from "@/lib/platforms/bluesky";
import { rankBlueskyProfile } from "@/lib/rank/bluesky";
import { rankLinkedInProfile } from "@/lib/rank/linkedin";
import { rankXProfile } from "@/lib/rank/x";
import { splitIntoThread, PLATFORM_LIMIT, type ThreadPlatform } from "@/lib/compose/thread";
import { recordRankSnapshot } from "@/lib/rank/store";
import type { RankResult } from "@/lib/rank/types";

export const freeToolRequestSchema = z.object({
  primaryText: z.string().min(2).max(4000),
  context: z.string().max(1200).optional(),
  email: z.string().email().optional(),
  utm_source: z.string().max(120).optional(),
  utm_medium: z.string().max(120).optional(),
  utm_campaign: z.string().max(120).optional(),
  utm_term: z.string().max(120).optional(),
  utm_content: z.string().max(120).optional(),
});

export type FreeToolRequest = z.infer<typeof freeToolRequestSchema>;

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function scoreFromText(value: string, floor = 58): number {
  const lengthScore = Math.min(22, Math.floor(compact(value).length / 18));
  const specificityScore = /\b(founder|coach|consultant|owner|saas|agency|b2b|client|customer|growth|sales|linkedin)\b/i.test(value) ? 12 : 4;
  const punctuationScore = /[|:-]/.test(value) ? 6 : 2;
  return Math.min(96, floor + lengthScore + specificityScore + punctuationScore);
}

function lineItems(items: string[]): string[] {
  return items.map((item) => item.replace(/\.$/, ""));
}

function deterministicToolResult(slug: string, input: FreeToolRequest): FreeToolResult {
  const primary = compact(input.primaryText);
  const context = compact(input.context ?? "");
  const audience = context || "your ideal audience";
  const score = scoreFromText(`${primary} ${context}`);

  if (slug === "linkedin-headline-analyzer") {
    return {
      title: "Your headline can work harder.",
      score,
      summary: "The strongest LinkedIn headlines name the audience, outcome, and proof direction in one readable line.",
      sections: [
        {
          title: "Rewrite direction",
          body: `Position yourself around ${audience}, then make the business outcome visible before the job title.`,
          items: lineItems([
            "Name who you help",
            "Name the outcome or transformation",
            "Add a credibility signal without inventing proof",
          ]),
        },
        {
          title: "Example structure",
          body: `I help ${audience} solve [specific problem] with [method] so they can [outcome].`,
        },
      ],
      cta: "Save this positioning and draft your next week of posts in FollowerSpike.",
    };
  }

  if (slug === "linkedin-post-generator") {
    return {
      title: "Draft post ready for review.",
      summary: "This post keeps the idea specific, useful, and easy to edit before publishing.",
      sections: [
        {
          title: "Generated post",
          body: `Most people do not have a LinkedIn idea problem. They have a consistency problem.\n\nTake this idea: ${primary}.\n\nThe useful move is to turn it into one clear lesson, one example, and one question your market can answer.\n\nFor ${audience}, that means showing the thinking behind the work instead of waiting for a perfect case study.\n\nWhat is one lesson you learned this week that your audience would find useful?`,
        },
        {
          title: "Why it works",
          body: "It opens with a point of view, ties the idea to a practical audience, and ends with a low-pressure conversation prompt.",
        },
      ],
      cta: "Build a full week of posts in FollowerSpike.",
    };
  }

  if (slug === "linkedin-comment-generator") {
    return {
      title: "Comment draft ready.",
      score,
      summary: "The first comment under your own post is where the detail that did not fit belongs.",
      sections: [
        {
          title: "Comment",
          body: `The part that did not fit above: ${audience} usually need a repeatable process more than another one-off tactic. The constraint is not knowing what to do. It is doing the right small things consistently.`,
        },
        {
          title: "Use when",
          body: "Post this under your own post, as the place for the extra detail, the source, or the link.",
        },
      ],
      cta: "Post this automatically as the first comment on your own posts.",
    };
  }

  if (slug === "connection-note-generator") {
    return {
      title: "Profile intro line ready.",
      summary: "One line that tells a first-time reader who you are and why your posts are worth following.",
      sections: [
        {
          title: "Intro line",
          body: `I work on ${primary}. Most of what I post here is what that keeps teaching me about ${audience}.`,
        },
        {
          title: "Why it works",
          body: "It names the work and the audience in one readable line, so a reader can decide to follow without opening anything else.",
        },
      ],
      cta: "Use this line across your X, LinkedIn, and Bluesky bios.",
    };
  }

  if (slug === "follow-up-dm-generator") {
    return {
      title: "Conversion path ready.",
      summary: "This turns the end of a post into a reply, and a reply into an email subscriber, without messaging anyone who did not ask.",
      sections: [
        {
          title: "Closing call to action",
          body: `I wrote up how I actually handle ${primary}, the version I would give another person working on ${audience}. Reply with GUIDE and your email address and I will send it over.`,
        },
        {
          title: "What happens next",
          body: "Keyword capture watches the replies on your own post for that word. When a reply contains an email address, the resource is emailed there. Nobody who did not reply hears from you.",
        },
      ],
      cta: "Set up keyword capture in FollowerSpike.",
    };
  }

  if (slug === "linkedin-icp-builder") {
    return {
      title: "ICP brief generated.",
      score,
      summary: "Your ICP should be specific enough to decide what you post, what you offer, and which questions you answer in public.",
      sections: [
        {
          title: "Audience",
          body: `${audience} who are actively dealing with the problem behind: ${primary}.`,
          items: lineItems(["Primary roles", "Trigger events", "Repeated pains", "Buying-context conversations"]),
        },
        {
          title: "Seed topics",
          body: "Use customer questions, objections, market changes, mistakes, frameworks, and before-after examples as the first topic map.",
        },
      ],
      cta: "Use this ICP to personalize your daily queue.",
    };
  }

  if (slug === "linkedin-content-calendar") {
    return {
      title: "One-week calendar ready.",
      summary: "This calendar rotates useful post types so the week does not feel repetitive.",
      sections: [
        {
          title: "7-day plan",
          body: "A practical LinkedIn calendar built from your topic.",
          items: [
            `Day 1: The problem behind ${primary}`,
            `Day 2: A mistake ${audience} often make`,
            "Day 3: A simple framework",
            "Day 4: A customer-safe example",
            "Day 5: A contrarian observation",
            "Day 6: A checklist or teardown",
            "Day 7: A question that invites real replies",
          ],
        },
      ],
      cta: "Generate these posts inside FollowerSpike.",
    };
  }

  if (slug === "linkedin-post-formatter") {
    return {
      title: "Formatted post ready.",
      summary: "The draft is now easier to scan with a stronger hook and cleaner spacing.",
      sections: [
        {
          title: "Formatted draft",
          body: `${primary.split(". ")[0]}.\n\nHere is the part worth paying attention to:\n\n${primary}\n\nFor ${audience}, the takeaway is simple: make the next action clear enough that the right person knows why it matters.`,
        },
      ],
      cta: "Save the formatting rules to your voice profile.",
    };
  }

  if (slug === "linkedin-topic-hashtag-tool") {
    return {
      title: "Topic map ready.",
      score,
      summary: "Use a few durable topics and restrained hashtags instead of chasing random trends.",
      sections: [
        {
          title: "Topic pillars",
          body: `Build recurring posts around ${primary}.`,
          items: lineItems(["Market beliefs", "Customer questions", "Operator lessons", "Frameworks", "Proof and examples"]),
        },
        {
          title: "Hashtags",
          body: "#linkedin #founder #b2b #personalbranding",
        },
      ],
      cta: "Turn topic pillars into a 30-day growth system.",
    };
  }

  return {
    title: "Positioning review generated.",
    score,
    summary: "Your fastest win is to make positioning, proof, audience, and posting rhythm obvious.",
    sections: [
      {
        title: "What to improve",
        body: `The profile or input should make it instantly clear who you help, what problem you solve, and why ${audience} should trust you.`,
        items: lineItems(["Sharper headline", "Clearer about section", "Visible proof", "Simple posting rhythm"]),
      },
      {
        title: "7-day activation",
        body: "Publish one useful post a day for a week, reply to everyone who replies to you, and end two of those posts with a clear next step.",
      },
    ],
    cta: "Run the full profile audit and start a trial.",
  };
}

/** Renders a computed rank into the shape the public tool UI expects. */
function rankToToolResult(rank: RankResult, cta: string): FreeToolResult {
  const pillarSection: FreeToolSection = {
    title: "Where the points went",
    body: "Each pillar is scored only on what we could actually read from your profile.",
    // A pillar with nothing but "unknown" checks was excluded from the score.
    // Showing it as 0/100 would read as a failure, which it is not.
    items: rank.pillars.map((pillar) =>
      pillar.checks.every((entry) => entry.status === "unknown")
        ? `${pillar.label}: not measured`
        : `${pillar.label}: ${pillar.score}/100`,
    ),
  };

  const fixSection: FreeToolSection = {
    title: rank.topFixes.length ? "Fix these first" : "Nothing urgent",
    body: rank.topFixes.length
      ? "Ordered by how many points each one is worth against how long it takes."
      : "Every check we run came back clean. Keep the cadence going.",
    items: rank.topFixes.map((fix) => `${fix.label}: ${fix.fix}`),
  };

  const evidenceSection: FreeToolSection = {
    title: "What we saw",
    body: "The observations this score was calculated from.",
    items: rank.pillars
      .flatMap((pillar) => pillar.checks)
      .filter((entry) => entry.status !== "unknown")
      .map((entry) => `${entry.status === "pass" ? "OK" : entry.status === "warn" ? "Weak" : "Missing"}: ${entry.evidence}`),
  };

  const failing = rank.topFixes.length;

  return {
    title: `${rank.handle} scores ${rank.score}/100.`,
    score: rank.score,
    summary: failing
      ? `We found ${failing} ${failing === 1 ? "thing" : "things"} costing you followers. The list below is ordered by what moves the number most for the least work.`
      : "Your profile passes every check we run. The remaining growth lever is what you post, not how your profile is set up.",
    sections: [pillarSection, fixSection, evidenceSection],
    cta,
  };
}

export async function runFreeTool(slug: string, input: FreeToolRequest): Promise<FreeToolResult> {
  const tool = getFreeTool(slug);
  if (!tool) {
    throw new Error("Unknown free tool");
  }

  // Threading is a character-count constraint, not a judgement call, so this
  // runs deterministically with no model and no key.
  if (slug === "thread-splitter") {
    const platform: ThreadPlatform = /bluesky/i.test(input.context ?? "") ? "bluesky" : "x";
    const posts = splitIntoThread(input.primaryText, { platform, numbered: true });
    const label = platform === "x" ? "X" : "Bluesky";

    return {
      title: `Your thread is ${posts.length} posts.`,
      summary: `Split for ${label} at ${PLATFORM_LIMIT[platform]} characters, breaking on sentence boundaries and never inside a link.`,
      sections: [
        {
          title: `Thread for ${label}`,
          body: "Copy these in order, or schedule the whole thread at once in FollowerSpike.",
          items: posts.map((post, index) => `${index + 1}. ${post}`),
        },
      ],
      cta: tool.cta,
    };
  }

  // Scored from pasted text for the same reason LinkedIn is: X retired its
  // unauthenticated profile endpoint, and this tool runs for people who have not
  // signed up, so there is no token to read with. Before this branch existed the
  // slug fell through to the generic writeup and returned prose that had never
  // looked at the profile.
  if (slug === "spike-rank-x") {
    const rank = rankXProfile(input.primaryText);
    const result = rankToToolResult(rank, tool.cta);
    const snapshotId = await recordRankSnapshot(rank);
    if (snapshotId) result.snapshotId = snapshotId;
    return result;
  }

  // Scored from text the member pastes; needs no API access and no key.
  if (slug === "spike-rank-linkedin") {
    const rank = rankLinkedInProfile(input.primaryText);
    const result = rankToToolResult(rank, tool.cta);
    const snapshotId = await recordRankSnapshot(rank);
    if (snapshotId) result.snapshotId = snapshotId;
    return result;
  }

  // Bluesky reads are public and free, so this tool runs live and ungated.
  if (slug === "spike-rank-bluesky") {
    try {
      const rank = await rankBlueskyProfile(input.primaryText);
      const result = rankToToolResult(rank, tool.cta);
      // Recorded here rather than in the route because this is the only place the
      // full RankResult exists; it is best-effort and never blocks the response.
      const snapshotId = await recordRankSnapshot(rank);
      if (snapshotId) result.snapshotId = snapshotId;
      return result;
    } catch (error) {
      if (error instanceof BlueskyNotFoundError) {
        return {
          title: "We could not find that account.",
          summary: `No Bluesky profile matched "${input.primaryText}". Check the handle and try again. It usually looks like yourname.bsky.social.`,
          sections: [],
          cta: tool.cta,
        };
      }
      throw error;
    }
  }

  try {
    if (slug === "linkedin-profile-audit") {
      const parsedUrl = linkedinUrlSchema.safeParse(input.primaryText);
      if (!parsedUrl.success) return deterministicToolResult(slug, input);
      const audit = await auditProfile({ linkedinUrl: parsedUrl.data, goal: input.context });
      return {
        title: "Profile audit generated.",
        score: audit.score,
        summary: audit.summary,
        sections: [
          { title: "Headline direction", body: audit.headlineSuggestion },
          { title: "About section direction", body: audit.aboutSuggestion },
          { title: "Checklist", body: "Start with these visible trust signals.", items: audit.photoBannerChecklist },
          { title: "Content plan", body: "Use this as the first week of your queue.", items: audit.contentPlan },
        ],
        cta: tool.cta,
      };
    }

    if (slug === "linkedin-post-generator") {
      const generated = await generatePost({ profile: { niche: input.context, icp_description: input.context } }, input.primaryText);
      return {
        title: "Draft post ready for review.",
        summary: generated.rationale,
        sections: [{ title: "Generated post", body: generated.content }],
        cta: tool.cta,
      };
    }

    if (slug === "linkedin-comment-generator") {
      const [relevance, generated] = await Promise.all([
        scoreRelevance({ profile: { icp_description: input.context } }, input.primaryText),
        generateComment({ profile: { icp_description: input.context } }, input.primaryText),
      ]);
      return {
        title: "Comment draft ready.",
        score: relevance.score * 10,
        summary: relevance.reason,
        sections: [{ title: "Comment", body: generated.comment }],
        cta: tool.cta,
      };
    }
  } catch {
    return deterministicToolResult(slug, input);
  }

  return deterministicToolResult(slug, input);
}

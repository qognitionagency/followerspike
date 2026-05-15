import { z } from "zod";
import { auditProfile, generateComment, generatePost, linkedinUrlSchema, scoreRelevance } from "@/lib/ai/generators";
import { getFreeTool, type FreeToolResult } from "@/lib/marketing/content";

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
      cta: "Save this positioning and generate a full LinkedIn growth queue.",
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
      summary: "A useful comment should add a layer to the post instead of repeating it.",
      sections: [
        {
          title: "Comment",
          body: `This is a useful point. The part I would add is that ${audience} usually need a repeatable process more than another one-off tactic. The constraint is not knowing what to do. It is doing the right small actions consistently.`,
        },
        {
          title: "Use when",
          body: "Use this when the target post is aligned with your market and your comment adds a real distinction.",
        },
      ],
      cta: "Queue comments against relevant industry posts.",
    };
  }

  if (slug === "connection-note-generator") {
    return {
      title: "Connection note ready.",
      summary: "Keep the request specific, low-pressure, and grounded in a real reason.",
      sections: [
        {
          title: "Connection note",
          body: `Hi, I came across your work around ${primary}. I am connecting with people thinking seriously about ${audience}. Would be glad to follow what you are building.`,
        },
        {
          title: "Why it works",
          body: "It gives context without pitching, asking for time, or pretending there is already a relationship.",
        },
      ],
      cta: "Find more right-fit profiles for your connection queue.",
    };
  }

  if (slug === "follow-up-dm-generator") {
    return {
      title: "Accepted-connection follow-up ready.",
      summary: "This keeps the first message conversational instead of turning the acceptance into a pitch.",
      sections: [
        {
          title: "Follow-up DM",
          body: `Thanks for connecting. I noticed the context around ${primary} and it felt relevant to what I share about ${audience}. Curious what you are focused on this quarter?`,
        },
        {
          title: "Boundary",
          body: "Use after a connection accepts. Avoid stacking this into a cold DM sequence.",
        },
      ],
      cta: "Manage accepted-connection follow-ups in Pro.",
    };
  }

  if (slug === "linkedin-icp-builder") {
    return {
      title: "ICP brief generated.",
      score,
      summary: "Your LinkedIn ICP should be specific enough to choose posts, comments, and connection targets.",
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
    title: "LinkedIn audit generated.",
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
        body: "Use one useful post, one relevant comment, and one right-fit connection each day to create early signal.",
      },
    ],
    cta: "Run the full profile audit and start a trial.",
  };
}

export async function runFreeTool(slug: string, input: FreeToolRequest): Promise<FreeToolResult> {
  const tool = getFreeTool(slug);
  if (!tool) {
    throw new Error("Unknown free tool");
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

import { CITIES, INDUSTRIES, ROLES } from "@/lib/constants";

export type SeoPageSeed = {
  slug: string;
  template_type: string;
  industry?: string;
  city?: string;
  role?: string;
  keyword: string;
  meta_title: string;
  meta_description: string;
  h1: string;
  intro_html: string;
  features_json: string[];
  workflow_example_json: { title: string; body: string };
  faq_json: Array<{ question: string; answer: string }>;
  published: boolean;
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function page(seed: {
  slug: string;
  templateType: string;
  keyword: string;
  h1: string;
  industry?: string;
  city?: string;
  role?: string;
}): SeoPageSeed {
  const audience = seed.role || seed.industry || seed.city || "busy professionals";
  const contextParts = [seed.industry, seed.role, seed.city ? `in ${seed.city}` : ""].filter(Boolean).join(" ");
  const context = contextParts || audience;
  // Every string below describes publishing, voice, and post-publish automation,
  // because that is what the product does. It used to describe likes, comments
  // on other people's posts, connection requests and follow-up DMs — the retired
  // browser-automation engine — across roughly thirteen hundred generated pages
  // at once, which made this template the single largest source of claims the
  // software could not honour.
  const introByType: Record<string, string> = {
    industry: `<p>${seed.keyword} is mostly a publishing problem: subject-matter expertise that never gets written down on a regular day. FollowerSpike learns how ${seed.industry} operators actually write, drafts in that voice, and publishes to X, LinkedIn, and Bluesky from one editor with every post reviewable first.</p>`,
    city: `<p>${seed.keyword} need a way to stay visible without spending every morning in three apps. FollowerSpike gives professionals in ${seed.city} one composer for X, LinkedIn, and Bluesky, a voice profile built from their own posts, and a review queue nothing leaves unapproved.</p>`,
    role: `<p>${seed.keyword} should protect voice and reputation while making consistency easier. FollowerSpike helps ${seed.role}s turn their own writing into a voice profile, publish it natively to each platform, and let the follow-ups — first comment, plug, cross-post, keyword capture — run inside caps they set.</p>`,
    industry_city: `<p>${seed.h1} starts with cadence: a point of view, published often enough to be remembered. FollowerSpike helps ${context} write once, see exactly what each platform will receive, and schedule it with quiet hours and daily caps applied.</p>`,
    role_city: `<p>${seed.h1} need a clear expert point of view and the discipline to publish it. FollowerSpike helps ${context} keep a steady presence with voice-modelled drafts, per-platform previews, and an approval queue.</p>`,
    comparison: `<p>${seed.keyword} comes down to control, consistency, and cost. FollowerSpike is a review-first publishing tool for people who want software leverage without pretending platform risk does not exist — which is why it publishes and reads only through official APIs, and never automates likes, follows, or connection requests.</p>`,
  };

  return {
    slug: seed.slug,
    template_type: seed.templateType,
    industry: seed.industry,
    city: seed.city,
    role: seed.role,
    keyword: seed.keyword,
    meta_title: `${seed.keyword} | FollowerSpike`,
    meta_description: `Use FollowerSpike to publish to X, LinkedIn, and Bluesky in your own voice, with a review queue and post-publish automations built for ${seed.keyword}.`,
    h1: seed.h1,
    intro_html:
      introByType[seed.templateType] ||
      `<p>FollowerSpike gives ${audience} one composer for X, LinkedIn, and Bluesky, a voice profile built from their own writing, a review-first queue, and account-safety controls.</p>`,
    features_json: [
      "Posts drafted in a voice profile built from your own writing",
      "One editor, native output for X, LinkedIn, and Bluesky",
      "Review-first approval queue with quiet hours and daily caps",
      "First comment, auto-plug, and cross-post relay after a post goes live",
      "Free profile scoring, and privacy controls including export and deletion",
    ],
    workflow_example_json: {
      title: "Example working session",
      body: `Write one post, check what each platform will actually publish, queue the first comment to go under it, and schedule the plug for four hours later. Everything for ${audience} waits in the queue until approved, and no automation acts until it is taken out of simulation.`,
    },
    faq_json: [
      {
        question: "Is FollowerSpike affiliated with LinkedIn?",
        answer:
          "No. FollowerSpike is an independent tool and is not affiliated with, endorsed by, or certified by X, LinkedIn, or Bluesky.",
      },
      {
        question: "Can I review content before it goes live?",
        answer:
          "Yes. Every post is scheduled through a queue you can edit or cancel from, and every automation simulates until you switch that off.",
      },
      {
        question: "Does it automate likes, follows, or connection requests?",
        answer:
          "No. Those carry real account risk and are deliberately not built. FollowerSpike publishes and reads through each platform's official API, and only ever acts on your own posts.",
      },
    ],
    published: true,
  };
}

export function buildSeoPages(): SeoPageSeed[] {
  const pages: SeoPageSeed[] = [];

  for (const industry of INDUSTRIES) {
    pages.push(
      page({
        slug: `linkedin-autopilot-for-${slugify(industry)}`,
        templateType: "industry",
        industry,
        keyword: `LinkedIn autopilot for ${industry}`,
        h1: `LinkedIn autopilot for ${industry}`,
      }),
      page({
        slug: `ai-ghostwriter-for-${slugify(industry)}`,
        templateType: "industry",
        industry,
        keyword: `AI ghostwriter for ${industry}`,
        h1: `AI LinkedIn ghostwriter for ${industry}`,
      })
    );
  }

  for (const city of CITIES) {
    pages.push(
      page({
        slug: `linkedin-automation-${slugify(city)}-founders`,
        templateType: "city",
        city,
        keyword: `LinkedIn automation for ${city} founders`,
        h1: `LinkedIn automation for ${city} founders`,
      }),
      page({
        slug: `linkedin-growth-tool-${slugify(city)}`,
        templateType: "city",
        city,
        keyword: `LinkedIn growth tool for ${city}`,
        h1: `LinkedIn growth tool for ${city}`,
      })
    );
  }

  for (const role of ROLES) {
    pages.push(
      page({
        slug: `linkedin-presence-tool-for-${slugify(role)}`,
        templateType: "role",
        role,
        keyword: `LinkedIn presence tool for ${role}`,
        h1: `LinkedIn presence tool for ${role}`,
      }),
      page({
        slug: `linkedin-content-automation-for-${slugify(role)}`,
        templateType: "role",
        role,
        keyword: `LinkedIn content automation for ${role}`,
        h1: `LinkedIn content automation for ${role}`,
      })
    );
  }

  for (const industry of INDUSTRIES) {
    for (const city of CITIES) {
      pages.push(
        page({
          slug: `linkedin-${slugify(industry)}-for-${slugify(city)}-founders`,
          templateType: "industry_city",
          industry,
          city,
          keyword: `LinkedIn ${industry} for ${city} founders`,
          h1: `LinkedIn ${industry} growth for ${city} founders`,
        })
      );
    }
  }

  for (const role of ROLES) {
    for (const city of CITIES) {
      pages.push(
        page({
          slug: `ai-linkedin-tool-for-${slugify(role)}-in-${slugify(city)}`,
          templateType: "role_city",
          role,
          city,
          keyword: `AI LinkedIn tool for ${role} in ${city}`,
          h1: `AI LinkedIn tool for ${role} in ${city}`,
        })
      );
    }
  }

  pages.push(
    page({
      slug: "linkedin-autopilot-for-founders",
      templateType: "comparison",
      role: "Founder",
      keyword: "LinkedIn autopilot for founders",
      h1: "LinkedIn autopilot for founders",
    }),
    page({
      slug: "linkedin-ghostwriter-for-ceos",
      templateType: "comparison",
      role: "CEO",
      keyword: "LinkedIn ghostwriter for CEOs",
      h1: "LinkedIn ghostwriter for CEOs",
    }),
    page({
      slug: "linkedin-automation-for-consultants",
      templateType: "comparison",
      role: "Consultant",
      keyword: "LinkedIn automation for consultants",
      h1: "LinkedIn automation for consultants",
    }),
    page({
      slug: "followerspike-vs-manual-linkedin-ghostwriting",
      templateType: "comparison",
      keyword: "FollowerSpike vs manual LinkedIn ghostwriting",
      h1: "FollowerSpike vs manual LinkedIn ghostwriting",
    }),
    page({
      slug: "followerspike-vs-hiring-a-linkedin-agency",
      templateType: "comparison",
      keyword: "FollowerSpike vs hiring a LinkedIn agency",
      h1: "FollowerSpike vs hiring a LinkedIn agency",
    })
  );

  return pages;
}

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
  testimonial_json: { quote: string; author: string };
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
  return {
    slug: seed.slug,
    template_type: seed.templateType,
    industry: seed.industry,
    city: seed.city,
    role: seed.role,
    keyword: seed.keyword,
    meta_title: `${seed.keyword} | FollowerSpike`,
    meta_description: `Use FollowerSpike to turn LinkedIn into a daily growth channel with posts, comments, and connections built for ${seed.keyword}.`,
    h1: seed.h1,
    intro_html:
      "<p>FollowerSpike gives busy professionals a risk-managed LinkedIn autopilot: brand-tone learning, review-first queues, relevance scoring, and account-safety controls.</p>",
    features_json: [
      "Daily posts in your voice",
      "Relevance-scored comments",
      "Founder-safe approval workflow",
      "Profile audit lead magnet",
      "GDPR-ready privacy controls",
    ],
    testimonial_json: {
      quote: "I finally had a LinkedIn rhythm without hiring a ghostwriter.",
      author: "Founder customer",
    },
    faq_json: [
      {
        question: "Is FollowerSpike affiliated with LinkedIn?",
        answer:
          "No. FollowerSpike is an independent tool and is not affiliated with, endorsed by, or certified by LinkedIn.",
      },
      {
        question: "Can I review content before it goes live?",
        answer:
          "Yes. Review mode is on by default for new users and can stay enabled for every post, comment, and connection.",
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

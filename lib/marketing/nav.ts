import { ROUTES } from "@/lib/constants";

export type MarketingNavItem = {
  label: string;
  href: string;
  description: string;
  badge?: string;
};

export type MarketingNavGroup = {
  title: string;
  items: MarketingNavItem[];
};

export const marketingNav: MarketingNavGroup[] = [
  {
    title: "Product",
    items: [
      { label: "Overview", href: ROUTES.home, description: "Clean product overview and demo." },
      { label: "How it works", href: "/#how-it-works", description: "Three-step founder growth workflow." },
      { label: "Features", href: "/#features", description: "Composer, voice, ranking, automations, and lead capture." },
      { label: "Multi-Platform Composer", href: "/features/multi-platform-composer", description: "One editor for X, LinkedIn, and Bluesky.", badge: "Core" },
      { label: "Voice Engine", href: "/features/voice-engine", description: "AI that writes like you, even with no posts to clone." },
      { label: "Spike Rank", href: "/features/spike-rank", description: "Score all three profiles and fix what costs you followers." },
      { label: "Growth Automations", href: "/features/growth-automations", description: "Auto-plug, first comment, evergreen, and cross-post relay." },
      { label: "Lead Capture", href: "/features/lead-capture", description: "Turn comments into email subscribers." },
      { label: "Safety Controls", href: "/features/safety-controls", description: "Official APIs, caps, quiet hours, and full logs." },
    ],
  },
  {
    title: "Solutions",
    items: [
      { label: "For founders", href: "/roles/founder", description: "Founder visibility without daily LinkedIn work." },
      { label: "For SMB owners", href: "/roles/small-business-owner", description: "Turn customer proof into account growth." },
      { label: "For coaches", href: "/roles/executive-coach", description: "Teach expertise and follow up tastefully." },
      { label: "For consultants", href: "/roles/consultant", description: "Build authority around your diagnostic lens." },
      { label: "Roles hub", href: "/roles", description: "Browse all role-based playbooks." },
      { label: "Industries hub", href: "/industries", description: "Browse industry-specific growth pages." },
      { label: "ICP hub", href: "/icp", description: "Build targeting pages around audience segments." },
    ],
  },
  {
    title: "Free Tools",
    items: [
      { label: "All free tools", href: "/free-tools", description: "Free founder growth tools, no signup." },
      { label: "X Profile Score", href: "/free-tools/spike-rank-x", description: "Score your X profile out of 100.", badge: "New" },
      { label: "Bluesky Profile Score", href: "/free-tools/spike-rank-bluesky", description: "Score your Bluesky profile out of 100." },
      { label: "LinkedIn Profile Score", href: "/free-tools/spike-rank-linkedin", description: "Paste your profile, get positioning and conversion gaps." },
      { label: "Founder Voice Finder", href: "/free-tools/founder-voice-finder", description: "Find your writing voice without writing anything." },
      { label: "Thread Splitter", href: "/free-tools/thread-splitter", description: "Turn a long draft into a thread that reads well." },
      { label: "Cross-Post Rewriter", href: "/free-tools/cross-post-rewriter", description: "Rewrite one post for all three platforms." },
      { label: "Hook Analyzer", href: "/free-tools/hook-analyzer", description: "Check whether your first line earns the second." },
      { label: "Founder Bio Generator", href: "/free-tools/founder-bio-generator", description: "Write your bio for all three platforms at once." },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Blog", href: "/blog", description: "Guides on founder posting, voice, and growth across platforms." },
      { label: "Comparisons", href: "/compare/ghostwriter-vs-linkedin-autopilot", description: "Compare software, agencies, ghostwriters, and manual work." },
      { label: "Trust center", href: ROUTES.trust, description: "How FollowerSpike uses official APIs, and what it will not do." },
      { label: "Security", href: ROUTES.security, description: "Privacy and security foundations." },
      { label: "Pricing", href: ROUTES.pricing, description: "Free, $19, $39, and $79 plans." },
      { label: "All pages", href: "/site-map", description: "Human-readable index of every public page." },
      { label: "XML sitemap", href: "/sitemap.xml", description: "Machine-readable canonical sitemap." },
      { label: "llms.txt", href: "/llms.txt", description: "LLM visibility summary." },
    ],
  },
];

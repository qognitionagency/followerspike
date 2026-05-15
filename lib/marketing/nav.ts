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
      { label: "Overview", href: ROUTES.home, description: "Interactive product-led overview." },
      { label: "LinkedIn Autopilot", href: "/features/linkedin-autopilot", description: "Run one conservative daily growth queue.", badge: "Core" },
      { label: "AI Posts", href: "/features/ai-linkedin-posts", description: "Draft useful LinkedIn posts in your own voice." },
      { label: "Engagement Queue", href: "/features/engagement-queue", description: "Find relevant conversations and draft thoughtful comments." },
      { label: "Connection Requests", href: "/features/connection-requests", description: "Connect with right-fit people using ICP matching." },
      { label: "Follow-up DMs", href: "/features/follow-up-dms", description: "Follow up after accepted connections without spam sequences." },
      { label: "Safety Controls", href: "/features/safety-controls", description: "Consent, limits, logs, and pause controls." },
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
      { label: "All free tools", href: "/free-tools", description: "Functional LinkedIn growth tools." },
      { label: "Profile Audit", href: "/free-tools/linkedin-profile-audit", description: "Score profile positioning and conversion gaps." },
      { label: "Headline Analyzer", href: "/free-tools/linkedin-headline-analyzer", description: "Improve who-you-help clarity." },
      { label: "Post Generator", href: "/free-tools/linkedin-post-generator", description: "Turn one idea into a LinkedIn post." },
      { label: "Comment Generator", href: "/free-tools/linkedin-comment-generator", description: "Draft useful comments for target posts." },
      { label: "Connection Note", href: "/free-tools/connection-note-generator", description: "Write specific, low-pressure connection notes." },
      { label: "Follow-up DM", href: "/free-tools/follow-up-dm-generator", description: "Draft warm accepted-connection follow-ups." },
      { label: "ICP Builder", href: "/free-tools/linkedin-icp-builder", description: "Turn a broad market into target signals." },
      { label: "Calendar Generator", href: "/free-tools/linkedin-content-calendar", description: "Create a one-week LinkedIn content plan." },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Blog", href: "/blog", description: "Guides on LinkedIn autopilot, ICP, safety, and growth." },
      { label: "Comparisons", href: "/compare/ghostwriter-vs-linkedin-autopilot", description: "Compare software, agencies, ghostwriters, and manual work." },
      { label: "Trust center", href: ROUTES.trust, description: "Safety, consent, platform risk, and controls." },
      { label: "Security", href: ROUTES.security, description: "Privacy and security foundations." },
      { label: "Pricing", href: ROUTES.pricing, description: "$9, $29, and $49 plans." },
    ],
  },
];

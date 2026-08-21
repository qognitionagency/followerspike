export const BRAND = {
  name: "FollowerSpike",
  promise:
    "Post to X, LinkedIn, and Bluesky in your own voice — and turn the reach into subscribers.",
  socialProof: "Built for solo founders, indie hackers, and one-person agencies",
  trialDays: 14,
  consentVersion: "2026-05-15",
} as const;

export const ROUTES = {
  home: "/",
  pricing: "/pricing",
  login: "/login",
  signup: "/signup",
  app: "/app",
  audit: "/tools/linkedin-audit",
  trust: "/trust",
  security: "/security",
  privacy: "/privacy",
  terms: "/terms",
  dpa: "/dpa",
  subprocessors: "/subprocessors",
} as const;

export type SubscriptionTier = "free" | "starter" | "pro" | "agency";
export type BillingCycle = "monthly" | "annual";
export type BillingCurrency = "USD";
export type ApprovalMode = "review" | "auto" | "off";
export type AutomationAction = "post" | "comment" | "invite" | "like" | "dm" | "reply" | "withdraw" | "profile_scrape";

export function normalizeSubscriptionTier(tier: unknown): SubscriptionTier {
  if (tier === "free" || tier === "starter" || tier === "pro" || tier === "agency") return tier;
  // Legacy tiers from the LinkedIn-autopilot pricing ladder. Existing subscribers
  // keep the nearest equivalent seat rather than being silently upgraded.
  if (tier === "essentials") return "starter";
  if (tier === "growth") return "pro";
  if (tier === "scale") return "pro";
  return "free";
}

// Paid tiers only. The free tier is handled by absence of a subscription row —
// see FREE_TIER_LIMITS below. `limits` are the per-day caps shown on the pricing page.
//
// `planEnv` and `annualPlanEnv` name the six Razorpay plans this ladder needs.
// There is no longer a fallback to the retired Essentials/Growth plan ids: the
// old names mapped Agency onto RAZORPAY_PLAN_PRO_MONTHLY_USD, so a deployment
// that set the new Pro plan and not the new Agency plan would have quietly
// charged an Agency subscriber the Pro price. Missing configuration should fail
// loudly, not bill the wrong amount.
export const PRICING = [
  {
    tier: "starter",
    name: "Starter",
    monthlyInr: "₹1,599",
    monthlyUsd: "$19",
    annualUsd: "$190",
    planEnv: "RAZORPAY_PLAN_STARTER_MONTHLY_USD",
    annualPlanEnv: "RAZORPAY_PLAN_STARTER_ANNUAL_USD",
    popular: false,
    description: "For the founder who wants to post consistently on all three channels without thinking about it.",
    limits: { posts: 2, comments: 5, invites: 0, likes: 0 },
    features: [
      "3 connected accounts — one per platform",
      "30 scheduled posts per month",
      "Unlimited AI rewriting, no credits",
      "Voice Interview — build your voice with no posts to import",
      "Weekly Spike Rank audit with full report",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    monthlyInr: "₹3,299",
    monthlyUsd: "$39",
    annualUsd: "$390",
    planEnv: "RAZORPAY_PLAN_PRO_MONTHLY_USD",
    annualPlanEnv: "RAZORPAY_PLAN_PRO_ANNUAL_USD",
    popular: true,
    description: "For founders turning reach into subscribers, with automation and voice cloning.",
    limits: { posts: 10, comments: 25, invites: 0, likes: 0 },
    features: [
      "6 connected accounts, unlimited scheduling",
      "Voice Cloner trained on your best posts",
      "Growth Plans that write straight into your queue",
      "Auto-Plug, First Comment, Evergreen, and Cross-post Relay",
      "Keyword capture on your posts, delivered by email, with hard caps",
    ],
  },
  {
    tier: "agency",
    name: "Agency",
    monthlyInr: "₹6,599",
    monthlyUsd: "$79",
    annualUsd: "$790",
    planEnv: "RAZORPAY_PLAN_AGENCY_MONTHLY_USD",
    annualPlanEnv: "RAZORPAY_PLAN_AGENCY_ANNUAL_USD",
    popular: false,
    description: "For ghostwriters and one-person agencies running several founder accounts.",
    limits: { posts: 30, comments: 60, invites: 0, likes: 0 },
    features: [
      "15 connected accounts across client workspaces",
      "A separate saved voice per client",
      "White-label Spike Rank reports",
      "Team approval workflow before anything publishes",
      "Priority support",
    ],
  },
] as const;

export const FREE_TIER_LIMITS = {
  connectedAccounts: 1,
  scheduledPostsTotal: 3,
  aiRewritesPerMonth: 5,
  auditsPerMonth: 1,
} as const;

export const INDUSTRIES = [
  "SaaS",
  "Fintech",
  "E-commerce",
  "Real Estate",
  "Healthcare",
  "EdTech",
  "Crypto and Web3",
  "AI and Machine Learning",
  "Cybersecurity",
  "Marketing Agencies",
  "Consulting",
  "Legal Services",
  "Manufacturing",
  "Logistics and Supply Chain",
  "HR and Recruiting",
  "Insurance",
  "Coaching and Personal Development",
  "Media and Publishing",
  "Hospitality and Travel",
  "CleanTech and Sustainability",
] as const;

export const CITIES = [
  "New York",
  "San Francisco",
  "Los Angeles",
  "Austin",
  "Chicago",
  "Boston",
  "Seattle",
  "Miami",
  "Toronto",
  "London",
  "Berlin",
  "Amsterdam",
  "Paris",
  "Dublin",
  "Lisbon",
  "Barcelona",
  "Bangalore",
  "Mumbai",
  "Delhi",
  "Singapore",
  "Dubai",
  "Tel Aviv",
  "Sydney",
  "Tokyo",
  "Sao Paulo",
] as const;

export const ROLES = [
  "Founder",
  "Co-founder",
  "CEO",
  "Solo Founder",
  "Indie Hacker",
  "Startup CTO",
  "Product Manager",
  "Head of Marketing",
  "VP Sales",
  "Chief Revenue Officer",
  "Growth Lead",
  "Sales Director",
  "Business Development Manager",
  "Consultant",
  "Small Business Owner",
  "Agency Owner",
  "Freelancer",
  "Executive Coach",
  "Career Coach",
  "Investor or VC",
  "Angel Investor",
  "Recruiter",
  "Real Estate Agent",
  "Financial Advisor",
  "Content Creator",
  "Personal Brand Builder",
] as const;

export const TRUST_DISCLAIMER =
  "FollowerSpike is not affiliated with, endorsed by, or certified by X, LinkedIn, or Bluesky. FollowerSpike publishes and reads only through each platform's official API, under permissions you grant and can revoke at any time. Outbound messages require a keyword opt-in from the recipient and are subject to daily caps you control.";

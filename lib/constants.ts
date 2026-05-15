export const BRAND = {
  name: "FollowerSpike",
  promise:
    "AI LinkedIn growth autopilot for posts, comments, connections, and follow-up DMs.",
  socialProof: "Built for founders, SMB owners, coaches, consultants, and personal brands",
  trialDays: 14,
  consentVersion: "2026-05-15",
} as const;

export const ROUTES = {
  home: "/",
  pricing: "/pricing",
  login: "/login",
  signup: "/signup",
  callback: "/callback",
  app: "/app",
  audit: "/tools/linkedin-audit",
  trust: "/trust",
  security: "/security",
  privacy: "/privacy",
  terms: "/terms",
  dpa: "/dpa",
  subprocessors: "/subprocessors",
} as const;

export type SubscriptionTier = "free" | "essentials" | "growth" | "pro";
export type BillingCycle = "monthly" | "annual";
export type BillingCurrency = "USD";
export type ApprovalMode = "review" | "auto" | "off";
export type AutomationAction = "post" | "comment" | "invite" | "like" | "dm" | "reply" | "withdraw" | "profile_scrape";

export function normalizeSubscriptionTier(tier: unknown): SubscriptionTier {
  if (tier === "essentials" || tier === "growth" || tier === "pro" || tier === "free") return tier;
  if (tier === "starter") return "essentials";
  if (tier === "scale") return "pro";
  return "free";
}

export const PRICING = [
  {
    tier: "essentials",
    name: "Essentials",
    monthlyInr: "₹799",
    monthlyUsd: "$9",
    annualUsd: "$90",
    planEnv: "RAZORPAY_PLAN_ESSENTIALS_MONTHLY_USD",
    legacyPlanEnv: "RAZORPAY_PLAN_STARTER",
    annualPlanEnv: "RAZORPAY_PLAN_ESSENTIALS_ANNUAL_USD",
    popular: false,
    description: "For solo professionals who want strong LinkedIn posts and a manual growth queue.",
    limits: { posts: 1, comments: 3, invites: 3, likes: 10 },
    features: [
      "1 AI post per day",
      "Post ideas and voice training",
      "Manual review queue",
      "Free profile audit",
      "Email reminders",
    ],
  },
  {
    tier: "growth",
    name: "Growth",
    monthlyInr: "₹1,999",
    monthlyUsd: "$29",
    annualUsd: "$290",
    planEnv: "RAZORPAY_PLAN_GROWTH_MONTHLY_USD",
    legacyPlanEnv: "RAZORPAY_PLAN_PRO",
    annualPlanEnv: "RAZORPAY_PLAN_GROWTH_ANNUAL_USD",
    popular: true,
    description: "For founders and SMB owners who want a review-first daily growth queue.",
    limits: { posts: 2, comments: 12, invites: 12, likes: 35 },
    features: [
      "2 AI posts per day",
      "Suggested likes and comments",
      "Target leader discovery",
      "Suggested connection requests",
      "Review-first growth queue",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    monthlyInr: "₹3,999",
    monthlyUsd: "$49",
    annualUsd: "$490",
    planEnv: "RAZORPAY_PLAN_PRO_MONTHLY_USD",
    legacyPlanEnv: "RAZORPAY_PLAN_SCALE",
    annualPlanEnv: "RAZORPAY_PLAN_PRO_ANNUAL_USD",
    popular: false,
    description: "For busy personal brands who want conservative autopilot execution.",
    limits: { posts: 3, comments: 25, invites: 20, likes: 60 },
    features: [
      "Full autopilot mode",
      "Accepted-connection follow-up DMs",
      "Reply drafts",
      "Higher daily limits",
      "Priority support",
    ],
  },
] as const;

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
  "FollowerSpike is not affiliated with, endorsed by, or certified by LinkedIn. Automation carries platform risk; FollowerSpike is designed with consent, review, rate limits, and pause controls to reduce that risk.";

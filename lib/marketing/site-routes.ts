import { ROUTES } from "@/lib/constants";
import {
  blogPosts,
  buildIndustryPages,
  buildRolePages,
  comparisonPages,
  featurePages,
  freeTools,
  icpPages,
} from "@/lib/marketing/content";
import { buildSeoPages } from "@/lib/seo";

export type PublicRoute = {
  label: string;
  href: string;
  description?: string;
};

export type PublicRouteGroup = {
  title: string;
  description: string;
  routes: PublicRoute[];
};

export const coreRoutes: PublicRoute[] = [
  { label: "Home", href: ROUTES.home, description: "Main LinkedIn growth autopilot landing page." },
  { label: "Pricing", href: ROUTES.pricing, description: "Starter, Pro, and Agency pricing." },
  { label: "Free audit", href: ROUTES.audit, description: "Legacy LinkedIn audit tool route." },
  { label: "Trust", href: ROUTES.trust, description: "Consent, risk, pause, and safety model." },
  { label: "Security", href: ROUTES.security, description: "Security and session handling." },
  { label: "Privacy", href: ROUTES.privacy, description: "Privacy policy." },
  { label: "Terms", href: ROUTES.terms, description: "Terms of service." },
  { label: "DPA", href: ROUTES.dpa, description: "Data processing addendum." },
  { label: "Subprocessors", href: ROUTES.subprocessors, description: "Subprocessor list." },
  { label: "Features hub", href: "/features", description: "Index of every product feature page." },
  { label: "How it works", href: "/how-it-works", description: "Three-step founder growth workflow." },
  { label: "All pages", href: "/site-map", description: "Human-readable public page index." },
  { label: "llms.txt", href: "/llms.txt", description: "LLM visibility file." },
  { label: "LinkedIn autopilot", href: "/linkedin-autopilot", description: "Pillar guide." },
  { label: "LinkedIn profile audit", href: "/linkedin-profile-audit", description: "Pillar guide." },
  { label: "LinkedIn ghostwriter", href: "/linkedin-ghostwriter", description: "Pillar guide." },
  { label: "Free tools hub", href: "/free-tools", description: "All public free tools." },
  { label: "Blog hub", href: "/blog", description: "All public articles." },
  { label: "Roles hub", href: "/roles", description: "Role-based playbooks." },
  { label: "Industries hub", href: "/industries", description: "Industry playbooks." },
  { label: "ICP hub", href: "/icp", description: "ICP playbooks." },
  { label: "Legacy profile audit", href: "/tools/linkedin-profile-audit", description: "Legacy tool route." },
  { label: "Profile roaster", href: "/tools/profile-roaster", description: "Legacy profile tool." },
];

export const publicRouteGroups: PublicRouteGroup[] = [
  {
    title: "Core Pages",
    description: "Primary marketing, trust, legal, and discovery pages.",
    routes: coreRoutes,
  },
  {
    title: "Product Features",
    description: "Feature pages for the LinkedIn growth autopilot workflow.",
    routes: featurePages.map((page) => ({
      label: page.eyebrow === "Autopilot" ? "LinkedIn Autopilot" : page.eyebrow,
      href: `/features/${page.slug}`,
      description: page.description,
    })),
  },
  {
    title: "Free Tools",
    description: "Functional public tools with instant lightweight results.",
    routes: freeTools.map((tool) => ({
      label: tool.name,
      href: `/free-tools/${tool.slug}`,
      description: tool.description,
    })),
  },
  {
    title: "Blog",
    description: "LinkedIn growth, automation safety, ICP, and workflow guides.",
    routes: blogPosts.map((post) => ({
      label: post.title,
      href: `/blog/${post.slug}`,
      description: post.description,
    })),
  },
  {
    title: "Roles",
    description: "Role-based LinkedIn growth playbooks.",
    routes: buildRolePages().map((page) => ({
      label: page.name,
      href: `/roles/${page.slug}`,
      description: page.description,
    })),
  },
  {
    title: "Industries",
    description: "Industry-specific LinkedIn growth playbooks.",
    routes: buildIndustryPages().map((page) => ({
      label: page.name,
      href: `/industries/${page.slug}`,
      description: page.description,
    })),
  },
  {
    title: "ICP",
    description: "Ideal-customer-profile growth systems.",
    routes: icpPages.map((page) => ({
      label: page.name,
      href: `/icp/${page.slug}`,
      description: page.description,
    })),
  },
  {
    title: "Comparisons",
    description: "Comparison pages for buying decisions.",
    routes: comparisonPages.map((page) => ({
      label: page.title,
      href: `/compare/${page.slug}`,
      description: page.description,
    })),
  },
  {
    title: "Legacy SEO Pages",
    description: "Programmatic /tools pages kept indexable for legacy search coverage.",
    routes: buildSeoPages().map((page) => ({
      label: page.h1,
      href: `/tools/${page.slug}`,
      description: page.meta_description,
    })),
  },
];

export function getAllPublicRoutes(): PublicRoute[] {
  const seen = new Set<string>();
  const routes: PublicRoute[] = [];

  for (const group of publicRouteGroups) {
    for (const route of group.routes) {
      if (seen.has(route.href)) continue;
      seen.add(route.href);
      routes.push(route);
    }
  }

  return routes;
}

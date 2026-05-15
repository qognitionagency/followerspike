import type { MetadataRoute } from "next";
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

const siteUrl = process.env.APP_URL || "http://localhost:3000";

const staticRoutes = [
  ROUTES.home,
  ROUTES.pricing,
  ROUTES.audit,
  ROUTES.trust,
  ROUTES.security,
  ROUTES.privacy,
  ROUTES.terms,
  ROUTES.dpa,
  ROUTES.subprocessors,
  "/linkedin-autopilot",
  "/linkedin-profile-audit",
  "/linkedin-ghostwriter",
  "/free-tools",
  "/blog",
  "/roles",
  "/industries",
  "/icp",
  "/tools/linkedin-profile-audit",
  "/tools/profile-roaster",
];

const marketingRoutes = [
  ...featurePages.map((page) => `/features/${page.slug}`),
  ...freeTools.map((tool) => `/free-tools/${tool.slug}`),
  ...blogPosts.map((post) => `/blog/${post.slug}`),
  ...buildRolePages().map((page) => `/roles/${page.slug}`),
  ...buildIndustryPages().map((page) => `/industries/${page.slug}`),
  ...icpPages.map((page) => `/icp/${page.slug}`),
  ...comparisonPages.map((page) => `/compare/${page.slug}`),
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticEntries = staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === ROUTES.home ? "weekly" : "monthly",
    priority: route === ROUTES.home ? 1 : 0.72,
  })) satisfies MetadataRoute.Sitemap;

  const seoEntries = buildSeoPages().map((page) => ({
    url: `${siteUrl}/tools/${page.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: page.template_type === "comparison" ? 0.74 : 0.58,
  })) satisfies MetadataRoute.Sitemap;

  const marketingEntries = marketingRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route.startsWith("/blog") ? "weekly" : "monthly",
    priority: route.startsWith("/features") || route.startsWith("/free-tools") ? 0.78 : 0.66,
  })) satisfies MetadataRoute.Sitemap;

  return [...staticEntries, ...marketingEntries, ...seoEntries];
}

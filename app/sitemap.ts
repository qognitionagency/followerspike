import type { MetadataRoute } from "next";
import { ROUTES } from "@/lib/constants";
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
  "/tools/linkedin-profile-audit",
  "/tools/profile-roaster",
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

  return [...staticEntries, ...seoEntries];
}

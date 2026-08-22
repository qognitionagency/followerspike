import { appUrl } from "@/lib/env";
import type { MetadataRoute } from "next";
import { ROUTES } from "@/lib/constants";
import { getAllPublicRoutes as getSiteRoutes } from "@/lib/marketing/site-routes";

const siteUrl = appUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return getSiteRoutes().map((route) => ({
    url: `${siteUrl}${route.href}`,
    lastModified: now,
    changeFrequency: route.href === ROUTES.home || route.href.startsWith("/blog") ? "weekly" : "monthly",
    priority: route.href === ROUTES.home ? 1 : route.href === "/site-map" ? 0.8 : 0.66,
  })) satisfies MetadataRoute.Sitemap;
}

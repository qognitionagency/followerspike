import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

/**
 * Crawl rules.
 *
 * The AI crawlers are listed explicitly and allowed. A wildcard `allow` already
 * permits them, but several of these agents are blocked by default in hosting
 * platform templates and CDN bot rules, and being named here is what makes the
 * intent unambiguous: this site wants to be cited in AI answers, and it ships
 * an /llms.txt for exactly that.
 *
 * The disallow list is the same on every agent. Those paths are either
 * authenticated (/app, /admin), a redirect stub (/dashboard), or an API — none
 * of them have content worth indexing, and /api answers 401 to a crawler
 * anyway.
 */
const disallow = ["/app/", "/dashboard/", "/admin/", "/api/"];

const aiCrawlers = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "meta-externalagent",
  "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = appUrl();

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...aiCrawlers.map((userAgent) => ({ userAgent, allow: "/", disallow })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

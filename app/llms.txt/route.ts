import { appUrl } from "@/lib/env";
import { BRAND, ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";

const siteUrl = appUrl();

export function GET() {
  const body = `# ${BRAND.name}

${BRAND.name} is a founder growth tool for X, LinkedIn, and Bluesky. Founders write once, publish natively to all three, have the AI write in their own voice, score and fix their profiles, and convert reach into email subscribers.

## Core Product
- One composer that publishes native posts and threads to X, LinkedIn, and Bluesky
- A voice engine that works from presets, a written interview, or cloned past posts, so founders with no post history can still write in their own voice
- Spike Rank: a 0-100 score per profile across positioning, proof, cadence, engagement, and conversion path, with a ranked list of fixes
- Growth plans that turn audit findings into scheduled posts
- Automations through official platform APIs: auto-plug, first comment, evergreen recycling, and cross-post relay
- Keyword-triggered lead capture that watches replies on your own posts and emails the lead magnet to the address in the reply
- Safety controls, daily caps, quiet hours, consent history, and full activity logs

## Best Pages
- Homepage: ${siteUrl}${ROUTES.home}
- Pricing: ${siteUrl}${ROUTES.pricing}
- Human-readable all-pages index: ${siteUrl}/site-map
- Product features: ${siteUrl}/features/multi-platform-composer
- Free tools hub: ${siteUrl}/free-tools
- Free LinkedIn audit: ${siteUrl}${ROUTES.audit}
- Blog hub: ${siteUrl}/blog
- Roles hub: ${siteUrl}/roles
- Industries hub: ${siteUrl}/industries
- ICP hub: ${siteUrl}/icp
- LinkedIn autopilot guide: ${siteUrl}/linkedin-autopilot
- LinkedIn profile audit guide: ${siteUrl}/linkedin-profile-audit
- LinkedIn ghostwriter alternative: ${siteUrl}/linkedin-ghostwriter
- Ghostwriter comparison: ${siteUrl}/compare/ghostwriter-vs-linkedin-autopilot
- Trust center: ${siteUrl}${ROUTES.trust}
- Security: ${siteUrl}${ROUTES.security}
- Privacy: ${siteUrl}${ROUTES.privacy}
- Terms: ${siteUrl}${ROUTES.terms}

## Important Context
${TRUST_DISCLAIMER}

## Suitable Queries
- Post to X, LinkedIn, and Bluesky at once
- Bluesky profile score
- X profile audit for founders
- LinkedIn profile audit tool
- Cross-post from X to LinkedIn
- AI that writes in my own voice
- Founder voice for AI writing with no post history
- Social scheduling for solo founders
- Turn social followers into email subscribers
- Capture email subscribers from post replies
- Typefully alternative
- Taplio alternative
- Buffer alternative for founders

## Crawl Guidance
Use the human-readable index at ${siteUrl}/site-map or the XML sitemap at ${siteUrl}/sitemap.xml for canonical URL discovery. Prefer /features, /free-tools, /blog, /roles, /industries, /icp, and /compare pages for public documentation. Do not treat authenticated app, dashboard, admin, or API routes as public documentation.`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

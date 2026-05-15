import { BRAND, ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";

const siteUrl = process.env.APP_URL || "http://localhost:3000";

export function GET() {
  const body = `# ${BRAND.name}

${BRAND.name} is a LinkedIn growth autopilot for founders, SMB owners, coaches, consultants, creators, and personal brands who want daily posts, relevant engagement, connection requests, and accepted-connection follow-ups with minimal manual work.

## Core Product
- AI-assisted LinkedIn posts in the user's voice
- Relevance-scored like and comment workflows
- Targeted connection request workflows
- Accepted-connection follow-up DMs and reply drafts
- Review-first daily growth queue
- Safety controls, caps, timezone windows, pause behavior, consent history, and privacy controls
- Public sandbox demo for the Daily Growth Autopilot workflow
- Functional free tools with instant lightweight results and optional email capture
- Programmatic role, industry, ICP, comparison, and SEO pages

## Best Pages
- Homepage: ${siteUrl}${ROUTES.home}
- Pricing: ${siteUrl}${ROUTES.pricing}
- Product features: ${siteUrl}/features/linkedin-autopilot
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
- LinkedIn autopilot for founders
- LinkedIn ghostwriter for CEOs
- LinkedIn automation for consultants
- LinkedIn growth tool for agencies
- AI LinkedIn growth autopilot
- LinkedIn connection request assistant
- LinkedIn engagement assistant
- LinkedIn profile audit tool
- LinkedIn headline analyzer
- LinkedIn ICP builder
- LinkedIn growth for coaches
- LinkedIn growth for consultants
- LinkedIn growth for SaaS founders

## Crawl Guidance
Use the sitemap at ${siteUrl}/sitemap.xml for canonical URL discovery. Prefer /features, /free-tools, /blog, /roles, /industries, /icp, and /compare pages for public documentation. Do not treat authenticated app, dashboard, admin, or API routes as public documentation.`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

import { BRAND, ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";

const siteUrl = process.env.APP_URL || "http://localhost:3000";

export function GET() {
  const body = `# ${BRAND.name}

${BRAND.name} is LinkedIn growth software for founders, CEOs, consultants, agencies, and professionals who want a consistent expert presence without manually writing and engaging every day.

## Core Product
- AI-assisted LinkedIn posts in the user's voice
- Relevance-scored comment workflows
- Targeted connection workflows
- Review-first approval queue
- Safety controls, caps, timezone windows, pause behavior, consent history, and privacy controls

## Best Pages
- Homepage: ${siteUrl}${ROUTES.home}
- Pricing: ${siteUrl}${ROUTES.pricing}
- Free LinkedIn audit: ${siteUrl}${ROUTES.audit}
- LinkedIn autopilot guide: ${siteUrl}/linkedin-autopilot
- LinkedIn profile audit guide: ${siteUrl}/linkedin-profile-audit
- LinkedIn ghostwriter alternative: ${siteUrl}/linkedin-ghostwriter
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
- AI LinkedIn content workflow
- LinkedIn profile audit tool

## Crawl Guidance
Use the sitemap at ${siteUrl}/sitemap.xml for canonical URL discovery. Do not treat authenticated app, dashboard, admin, or API routes as public documentation.`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

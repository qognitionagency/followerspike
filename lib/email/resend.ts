import { Resend } from "resend";
import { BRAND, ROUTES } from "@/lib/constants";
import { appUrl, optionalEnv } from "@/lib/env";
import type { AuditResult } from "@/lib/types";

type AuditEmailDelivery =
  | { status: "sent"; id: string | null }
  | { status: "skipped"; reason: "missing_api_key" };

function resendClient(): Resend | null {
  const apiKey = optionalEnv("RESEND_API_KEY");
  return apiKey ? new Resend(apiKey) : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderList(items: string[]): string {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderTextList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

type LeadEmailDelivery =
  | { status: "sent"; id: string | null }
  | { status: "skipped"; reason: "missing_api_key" };

/**
 * The thing a captured lead replied to ask for.
 *
 * The body is the user's own text, so it is escaped and rendered as paragraphs
 * rather than passed through as HTML — a founder pasting a link and two lines of
 * context must not be able to put markup into an email that goes out under the
 * product's sending domain.
 *
 * Sent with an idempotency key on the lead id, matching the audit email above:
 * a job that succeeds at Resend and then dies before stamping `delivered_at`
 * retries, and the retry must not be a second copy in a stranger's inbox.
 */
export async function sendLeadDeliveryEmail(params: {
  to: string;
  subject: string;
  body: string;
  link: string | null;
  handle: string;
  leadId: string;
}): Promise<LeadEmailDelivery> {
  const client = resendClient();
  if (!client) {
    return { status: "skipped", reason: "missing_api_key" };
  }

  const from = optionalEnv("RESEND_FROM_EMAIL", "FollowerSpike <founders@followerspike.com>");
  const replyTo = optionalEnv("RESEND_REPLY_TO_EMAIL");
  const paragraphs = params.body
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 16px;line-height:1.6">${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("");

  const { data, error } = await client.emails.send(
    {
      from,
      to: params.to,
      replyTo: replyTo || undefined,
      subject: params.subject,
      tags: [
        { name: "product", value: "followerspike" },
        { name: "kind", value: "lead-delivery" },
      ],
      html: `
      <div style="margin:0;background:#f7f4ee;padding:32px 0;font-family:Inter,Arial,sans-serif;color:#191919">
        <div style="margin:0 auto;max-width:640px;border:1px solid #e5e7eb;background:#ffffff;padding:32px">
          ${paragraphs}
          ${
            params.link
              ? `<p style="margin:24px 0 0"><a href="${escapeHtml(params.link)}" style="display:inline-block;background:#0A66C2;color:#fff;padding:13px 20px;border-radius:999px;text-decoration:none;font-weight:800">Open the link</a></p>`
              : ""
          }
          <p style="margin-top:28px;font-size:12px;color:#666">
            You asked for this by replying to a post as ${escapeHtml(params.handle)}. It was sent once, and there is no list to unsubscribe from.
          </p>
        </div>
      </div>
    `,
      text: [
        params.body,
        params.link ? `\n${params.link}` : "",
        `\nYou asked for this by replying to a post as ${params.handle}. It was sent once, and there is no list to unsubscribe from.`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
    { idempotencyKey: `lead-delivery/${params.leadId}` }
  );

  if (error) {
    throw new Error(`Resend lead delivery failed: ${error.message}`);
  }

  return { status: "sent", id: data?.id ?? null };
}

export async function sendAuditLeadEmail(params: {
  email: string;
  audit: AuditResult;
  linkedinUrl: string;
  leadId?: string;
}): Promise<AuditEmailDelivery> {
  const client = resendClient();
  if (!client) {
    return { status: "skipped", reason: "missing_api_key" };
  }

  const from = optionalEnv("RESEND_FROM_EMAIL", "FollowerSpike <founders@followerspike.com>");
  const replyTo = optionalEnv("RESEND_REPLY_TO_EMAIL");
  const ctaUrl = `${appUrl()}${ROUTES.signup}?source=audit`;
  const escapedLinkedInUrl = escapeHtml(params.linkedinUrl);
  const escapedSummary = escapeHtml(params.audit.summary);
  const escapedHeadline = escapeHtml(params.audit.headlineSuggestion);
  const escapedAbout = escapeHtml(params.audit.aboutSuggestion);

  const { data, error } = await client.emails.send(
    {
      from,
      to: params.email,
      replyTo: replyTo || undefined,
      subject: `Your LinkedIn audit score: ${params.audit.score}/100`,
      tags: [
        { name: "product", value: "followerspike" },
        { name: "kind", value: "linkedin-audit" },
      ],
      html: `
      <div style="margin:0;background:#f7f4ee;padding:32px 0;font-family:Inter,Arial,sans-serif;color:#191919">
        <div style="margin:0 auto;max-width:680px;border:1px solid #e5e7eb;background:#ffffff;padding:32px">
        <p style="margin:0 0 10px;color:#0A66C2;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">${BRAND.name} audit</p>
        <h1 style="margin:0 0 18px;font-size:32px;line-height:1.1">Your LinkedIn audit is ready</h1>
        <p><strong>Score:</strong> ${params.audit.score}/100</p>
        <p>${escapedSummary}</p>
        <h2>Fastest fix</h2>
        <p style="padding:14px 16px;border-left:4px solid #0A66C2;background:#EEF3F8">${escapedHeadline}</p>
        <h2>About section rebuild</h2>
        <p>${escapedAbout}</p>
        <h2>Profile checklist</h2>
        <ul>${renderList(params.audit.photoBannerChecklist)}</ul>
        <h2>Keyword gaps</h2>
        <ul>${renderList(params.audit.keywordGaps)}</ul>
        <h2>7-day activation plan</h2>
        <ul>${renderList(params.audit.contentPlan)}</ul>
        <h2>Risk flags</h2>
        <ul>${renderList(params.audit.riskFlags)}</ul>
        <p style="margin-top:28px"><a href="${ctaUrl}" style="display:inline-block;background:#0A66C2;color:#fff;padding:13px 20px;border-radius:999px;text-decoration:none;font-weight:800">Start 14-Day Trial</a></p>
        <p style="margin-top:28px;font-size:12px;color:#666">Audited profile: ${escapedLinkedInUrl}</p>
        <p style="font-size:12px;color:#666">${BRAND.name} is not affiliated with, endorsed by, or certified by LinkedIn.</p>
        </div>
      </div>
    `,
      text: [
        `${BRAND.name} LinkedIn audit`,
        `Score: ${params.audit.score}/100`,
        "",
        params.audit.summary,
        "",
        "Fastest fix",
        params.audit.headlineSuggestion,
        "",
        "About section rebuild",
        params.audit.aboutSuggestion,
        "",
        "Profile checklist",
        renderTextList(params.audit.photoBannerChecklist),
        "",
        "Keyword gaps",
        renderTextList(params.audit.keywordGaps),
        "",
        "7-day activation plan",
        renderTextList(params.audit.contentPlan),
        "",
        "Risk flags",
        renderTextList(params.audit.riskFlags),
        "",
        `Start trial: ${ctaUrl}`,
        `Audited profile: ${params.linkedinUrl}`,
        `${BRAND.name} is not affiliated with, endorsed by, or certified by LinkedIn.`,
      ].join("\n"),
    },
    {
      idempotencyKey: params.leadId ? `audit-lead/${params.leadId}` : undefined,
    }
  );

  if (error) {
    throw new Error(`Resend audit email failed: ${error.message}`);
  }

  return { status: "sent", id: data?.id ?? null };
}

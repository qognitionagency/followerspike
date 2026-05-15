import { Resend } from "resend";
import { BRAND, ROUTES } from "@/lib/constants";
import { appUrl, optionalEnv } from "@/lib/env";
import type { AuditResult } from "@/lib/types";

function resendClient(): Resend | null {
  const apiKey = optionalEnv("RESEND_API_KEY");
  return apiKey ? new Resend(apiKey) : null;
}

export async function sendAuditLeadEmail(params: {
  email: string;
  audit: AuditResult;
  linkedinUrl: string;
}): Promise<void> {
  const client = resendClient();
  if (!client) return;

  const from = optionalEnv("RESEND_FROM_EMAIL", "FollowerSpike <founders@followerspike.com>");
  const ctaUrl = `${appUrl()}${ROUTES.signup}?source=audit`;

  await client.emails.send({
    from,
    to: params.email,
    subject: `Your LinkedIn audit score: ${params.audit.score}/100`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#191919">
        <h1>Your ${BRAND.name} audit is ready</h1>
        <p><strong>Score:</strong> ${params.audit.score}/100</p>
        <p>${params.audit.summary}</p>
        <h2>Fastest fix</h2>
        <p>${params.audit.headlineSuggestion}</p>
        <p><a href="${ctaUrl}" style="background:#0A66C2;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Start 14-Day Trial</a></p>
        <p style="font-size:12px;color:#666">Audited profile: ${params.linkedinUrl}</p>
      </div>
    `,
  });
}

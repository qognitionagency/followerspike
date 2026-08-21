import { NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect";
import { z } from "zod";
import { auditProfileResult, linkedinUrlSchema } from "@/lib/ai/generators";
import { requireAppSession } from "@/lib/session";
import { getWorkspace } from "@/lib/workspace";
import { db } from "@/lib/db";

const AuditBodySchema = z.object({
  linkedinUrl: linkedinUrlSchema,
  goal: z.string().max(180).optional(),
  headline: z.string().max(180).optional(),
  about: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireAppSession();
    const body = AuditBodySchema.parse((await request.json()) as unknown);

    // Attribution only — profile_audits is keyed by user, but the AI cost row is
    // rolled up per workspace, so a missing workspace must not fail the audit.
    const workspace = await getWorkspace(session);

    const audit = await auditProfileResult(body, {
      workspaceId: workspace?.workspace.id ?? null,
      userId: session.userId,
    });

    // A stored score drives the dashboard and the follow-up email. Writing a
    // canned 64 into profile_audits would make an outage indistinguishable from
    // a real assessment for as long as the row lives.
    if (!audit.ok) {
      const status = audit.reason === "no_provider_configured" ? 503 : 502;
      return NextResponse.json({ error: "AI generation is unavailable" }, { status });
    }

    const result = audit.value;
    const sql = db();
    await sql`
      insert into profile_audits (
        user_id, linkedin_url, score, is_empty_profile, summary,
        headline_suggestion, about_suggestion, photo_banner_checklist,
        keyword_gaps, content_plan, risk_flags
      )
      values (
        ${session.userId},
        ${body.linkedinUrl},
        ${result.score},
        ${result.isEmptyProfile},
        ${result.summary},
        ${result.headlineSuggestion},
        ${result.aboutSuggestion},
        ${result.photoBannerChecklist},
        ${result.keywordGaps},
        ${result.contentPlan},
        ${result.riskFlags}
      )
    `;

    return NextResponse.json(result);
  } catch (error) {
    // requireAppSession redirects by throwing. Swallowing that turned an
    // unreachable database into a generic 500; re-throwing it here would answer
    // an API client with a 307 to an HTML login page, which is no better.
    // Middleware already 401s anonymous /api callers, so reaching this line
    // means the session could not be resolved server-side — a dependency
    // failure, which is what this reports.
    if (isRedirectError(error)) {
      return NextResponse.json({ error: "Session is unavailable" }, { status: 503 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Audit failed" }, { status: 500 });
  }
}

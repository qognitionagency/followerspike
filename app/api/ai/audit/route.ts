import { NextResponse } from "next/server";
import { z } from "zod";
import { auditProfile, linkedinUrlSchema } from "@/lib/ai/generators";
import { requireAppSession } from "@/lib/session";
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
    const audit = await auditProfile(body);
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
        ${audit.score},
        ${audit.isEmptyProfile},
        ${audit.summary},
        ${audit.headlineSuggestion},
        ${audit.aboutSuggestion},
        ${audit.photoBannerChecklist},
        ${audit.keywordGaps},
        ${audit.contentPlan},
        ${audit.riskFlags}
      )
    `;

    return NextResponse.json(audit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Audit failed" }, { status: 500 });
  }
}

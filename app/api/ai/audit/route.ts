import { NextResponse } from "next/server";
import { z } from "zod";
import { auditProfile, linkedinUrlSchema } from "@/lib/ai/generators";
import { requireAppSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

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
    const supabase = await createClient();

    await supabase.from("profile_audits").insert({
      user_id: session.userId,
      linkedin_url: body.linkedinUrl,
      score: audit.score,
      is_empty_profile: audit.isEmptyProfile,
      summary: audit.summary,
      headline_suggestion: audit.headlineSuggestion,
      about_suggestion: audit.aboutSuggestion,
      photo_banner_checklist: audit.photoBannerChecklist,
      keyword_gaps: audit.keywordGaps,
      content_plan: audit.contentPlan,
      risk_flags: audit.riskFlags,
    });

    return NextResponse.json(audit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Audit failed" }, { status: 500 });
  }
}

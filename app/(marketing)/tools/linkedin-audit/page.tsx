import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AlertTriangle, CheckCircle2, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRAND, ROUTES } from "@/lib/constants";
import { auditProfile, linkedinUrlSchema } from "@/lib/ai/generators";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAuditLeadEmail } from "@/lib/email/resend";

export const metadata: Metadata = {
  title: "Free LinkedIn Profile Audit",
  description:
    "Get a free LinkedIn audit with a score, profile rebuild plan, and founder content prompts. Works even if your profile is empty.",
};

const auditFormSchema = z.object({
  email: z.string().email(),
  linkedinUrl: linkedinUrlSchema,
  goal: z.string().max(180).optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
});

async function runAudit(formData: FormData) {
  "use server";

  const parsed = auditFormSchema.safeParse({
    email: formData.get("email"),
    linkedinUrl: formData.get("linkedinUrl"),
    goal: formData.get("goal") || undefined,
    utm_source: formData.get("utm_source") || undefined,
    utm_medium: formData.get("utm_medium") || undefined,
    utm_campaign: formData.get("utm_campaign") || undefined,
    utm_term: formData.get("utm_term") || undefined,
    utm_content: formData.get("utm_content") || undefined,
  });

  if (!parsed.success) {
    redirect(`${ROUTES.audit}?error=invalid`);
  }

  const supabase = createAdminClient();
  const { data: lead, error: leadError } = await supabase
    .from("audit_leads")
    .insert({
      email: parsed.data.email,
      linkedin_url: parsed.data.linkedinUrl,
      goal: parsed.data.goal,
      utm_source: parsed.data.utm_source,
      utm_medium: parsed.data.utm_medium,
      utm_campaign: parsed.data.utm_campaign,
      utm_term: parsed.data.utm_term,
      utm_content: parsed.data.utm_content,
      status: "processing",
    })
    .select("id")
    .single();

  if (leadError || !lead) {
    redirect(`${ROUTES.audit}?error=server`);
  }

  const audit = await auditProfile({
    linkedinUrl: parsed.data.linkedinUrl,
    goal: parsed.data.goal,
  });

  await supabase.from("profile_audits").insert({
    audit_lead_id: lead.id,
    linkedin_url: parsed.data.linkedinUrl,
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

  await supabase.from("audit_leads").update({ status: "completed" }).eq("id", lead.id);
  await sendAuditLeadEmail({ email: parsed.data.email, audit, linkedinUrl: parsed.data.linkedinUrl });

  redirect(`${ROUTES.audit}?submitted=1&score=${audit.score}&empty=${audit.isEmptyProfile ? "1" : "0"}`);
}

export default async function LinkedInAuditPage({
  searchParams = {},
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = searchParams;
  const submitted = params.submitted === "1";
  const score = typeof params.score === "string" ? params.score : null;
  const empty = params.empty === "1";

  return (
    <div className="min-h-screen bg-[#F4F2EE] text-[#191919]">
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-20">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#BFD7F0] bg-white px-3 py-1 text-sm font-bold text-[#0A66C2]">
            <Sparkles className="h-4 w-4" />
            Free lead magnet
          </div>
          <h1 className="mt-5 text-5xl font-black tracking-tight text-[#191919]">
            Find out why your LinkedIn is not converting.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[#555]">
            Get an AI profile audit with a score, headline rewrite, keyword gaps, and a 7-day activation plan.
            If your profile is empty, private, or missing everything, FollowerSpike gives you a rebuild plan instead
            of a blank error.
          </p>
          <div className="mt-8 grid gap-3">
            {[
              "Works for founders, CEOs, consultants, and executives",
              "Gates the full report behind email so you can capture leads",
              "Includes empty-profile recovery for no image, no experience, no posts, and no education",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 text-sm font-semibold text-[#333]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0A66C2]" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
          {submitted ? (
            <div className="space-y-5">
              <div className="rounded-xl bg-[#EEF3F8] p-5">
                <p className="text-sm font-black uppercase tracking-wide text-[#0A66C2]">Audit sent</p>
                <h2 className="mt-2 text-4xl font-black text-[#191919]">{score}/100</h2>
                <p className="mt-2 text-sm leading-6 text-[#555]">
                  Your full report is on its way. {empty ? "Because the profile had little public signal, the report focuses on a full foundation rebuild." : "The report includes your fastest positioning fixes."}
                </p>
              </div>
              <Button asChild className="h-12 w-full rounded-full bg-[#0A66C2] font-bold text-white hover:bg-[#004182]">
                <a href={ROUTES.signup}>Start 14-Day Trial</a>
              </Button>
            </div>
          ) : (
            <form action={runAudit} className="space-y-5">
              <div>
                <h2 className="text-2xl font-black text-[#191919]">Get your free audit</h2>
                <p className="mt-2 text-sm leading-6 text-[#666]">
                  We will email the full result and use it to personalize your first FollowerSpike app session.
                </p>
              </div>
              {params.error ? (
                <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Please enter a valid email and LinkedIn profile URL.
                </div>
              ) : null}
              <Input name="email" type="email" placeholder="founder@company.com" required className="h-12 bg-white" />
              <Input
                name="linkedinUrl"
                type="url"
                placeholder="https://www.linkedin.com/in/yourname"
                required
                className="h-12 bg-white"
              />
              <Input
                name="goal"
                placeholder="Goal: inbound leads, hiring, investor visibility..."
                className="h-12 bg-white"
              />
              {["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].map((key) => (
                <input key={key} type="hidden" name={key} value={typeof params[key] === "string" ? params[key] : ""} />
              ))}
              <Button className="h-12 w-full rounded-full bg-[#0A66C2] text-base font-black text-white hover:bg-[#004182]">
                Email My Audit
              </Button>
              <div className="flex items-center gap-2 text-xs text-[#666]">
                <Mail className="h-4 w-4" />
                Full report sent by email.
                <LockKeyhole className="ml-2 h-4 w-4" />
                GDPR-ready lead capture.
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

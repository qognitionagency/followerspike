import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  LockKeyhole,
  Mail,
  MailCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/constants";
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

const auditSignals = [
  { icon: BrainCircuit, label: "Gemini Pro audit" },
  { icon: MailCheck, label: "Resend delivery" },
  { icon: ShieldCheck, label: "Consent-first lead capture" },
];

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

  let delivery = "sent";
  try {
    const emailDelivery = await sendAuditLeadEmail({
      email: parsed.data.email,
      audit,
      linkedinUrl: parsed.data.linkedinUrl,
      leadId: lead.id,
    });
    delivery = emailDelivery.status === "sent" ? "sent" : "local";
    await supabase.from("audit_leads").update({ status: emailDelivery.status === "sent" ? "completed" : "email_skipped" }).eq("id", lead.id);
  } catch {
    delivery = "failed";
    await supabase.from("audit_leads").update({ status: "email_failed" }).eq("id", lead.id);
  }

  redirect(`${ROUTES.audit}?submitted=1&score=${audit.score}&empty=${audit.isEmptyProfile ? "1" : "0"}&delivery=${delivery}`);
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
  const delivery = typeof params.delivery === "string" ? params.delivery : "sent";
  const deliveryCopy =
    delivery === "failed"
      ? "The audit was generated, but email delivery failed. Check Resend configuration before launch."
      : delivery === "local"
        ? "The audit was generated. Resend is not configured in this environment, so no email was sent locally."
        : "Your full report is on its way through Resend.";

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#191919]">
      <MarketingHeader />
      <main>
        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#BFD7F0] bg-white px-3 py-1 text-sm font-bold text-[#0A66C2]">
              <Sparkles className="h-4 w-4" />
              Free Resend audit
            </div>
            <h1 className="mt-5 max-w-3xl text-5xl font-black tracking-tight text-[#191919] lg:text-6xl">
              Turn one LinkedIn URL into a founder positioning plan.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#555]">
              Gemini Pro analyzes the profile signal, FollowerSpike converts it into practical recommendations, and
              Resend delivers the full report to the lead inbox.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {auditSignals.map((signal) => {
                const Icon = signal.icon;
                return (
                  <div key={signal.label} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                    <Icon className="h-5 w-5 text-[#0A66C2]" />
                    <p className="mt-3 text-sm font-black text-[#111827]">{signal.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 grid gap-3">
              {[
                "Works for founders, CEOs, consultants, and executives",
                "Returns a rebuild plan even when the profile is sparse or private",
                "Captures source, campaign, and intent before trial sign-up",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm font-semibold text-[#333]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0A66C2]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            {submitted ? (
              <div className="space-y-5">
                <div className="rounded-xl bg-[#EEF3F8] p-5">
                  <p className="text-sm font-black uppercase tracking-wide text-[#0A66C2]">Audit generated</p>
                  <h2 className="mt-2 text-4xl font-black text-[#191919]">{score}/100</h2>
                  <p className="mt-2 text-sm leading-6 text-[#555]">
                    {deliveryCopy}{" "}
                    {empty
                      ? "Because the profile had little public signal, the report focuses on a full foundation rebuild."
                      : "The report includes your fastest positioning fixes."}
                  </p>
                </div>
                <Button asChild className="h-12 w-full rounded-full bg-[#0A66C2] font-bold text-white hover:bg-[#004182]">
                  <a href={`${ROUTES.signup}?source=audit`}>
                    Start 14-Day Trial
                    <ArrowRight className="h-4 w-4" />
                  </a>
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
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#666]">
                  <Mail className="h-4 w-4" />
                  Full report sent by Resend.
                  <LockKeyhole className="ml-2 h-4 w-4" />
                  GDPR-ready lead capture.
                </div>
              </form>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Score", "A fast read on whether the profile currently creates enough trust and intent."],
              ["Rewrite", "Headline and about section suggestions without invented claims or fake proof."],
              ["Activation", "A 7-day content plan that can feed the first FollowerSpike queue."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                <p className="text-lg font-black text-[#111827]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-[#555]">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

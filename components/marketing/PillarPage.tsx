import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SignupButton } from "@/components/marketing/SignupButton";
import { BRAND, ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";

type PillarPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  sections: Array<{ title: string; body: string }>;
  faq: Array<{ question: string; answer: string }>;
};

export function PillarPage({ eyebrow, title, description, bullets, sections, faq }: PillarPageProps) {
  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#191919]">
      <MarketingHeader />
      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-24">
          <div>
            <p className="text-sm font-black uppercase text-[#0A66C2]">{eyebrow}</p>
            <h1 className="mt-4 text-5xl font-black leading-tight text-[#111827] sm:text-6xl">{title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4b5563]">{description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <SignupButton className="h-12 rounded-full bg-[#111827] px-7 text-base font-black text-white hover:bg-[#0A66C2]">
                Start {BRAND.trialDays}-Day Trial
                <ArrowRight className="h-4 w-4" />
              </SignupButton>
              <Link
                href={ROUTES.audit}
                className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-7 text-base font-black text-[#111827] hover:text-[#0A66C2]"
              >
                Get Free Audit
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <ShieldCheck className="h-7 w-7 text-[#0A66C2]" />
            <h2 className="mt-4 text-2xl font-black text-[#111827]">What FollowerSpike gives you</h2>
            <div className="mt-6 grid gap-3">
              {bullets.map((bullet) => (
                <div key={bullet} className="flex gap-3 rounded-xl bg-[#f7f4ee] p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <p className="text-sm font-bold leading-6 text-[#4b5563]">{bullet}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
            {sections.map((section) => (
              <div key={section.title} className="rounded-2xl border border-black/10 bg-[#f7f4ee] p-6">
                <h2 className="text-xl font-black text-[#111827]">{section.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#4b5563]">{section.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-sm font-black uppercase text-[#0A66C2]">FAQ</p>
          <h2 className="mt-3 text-4xl font-black text-[#111827]">Clear answers for buyers.</h2>
          <div className="mt-8 grid gap-4">
            {faq.map((item) => (
              <div key={item.question} className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
                <h3 className="font-black text-[#111827]">{item.question}</h3>
                <p className="mt-3 leading-7 text-[#4b5563]">{item.answer}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm leading-6 text-[#666]">{TRUST_DISCLAIMER}</p>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

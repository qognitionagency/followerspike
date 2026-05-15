import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, LockKeyhole, PauseCircle, ShieldCheck, UserRoundCheck } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { PricingCards } from "@/components/marketing/PricingCards";
import { ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "FollowerSpike pricing for founders, CEOs, consultants, and executives who want LinkedIn consistency without hiring a ghostwriter.",
};

const trustItems = [
  { icon: LockKeyhole, label: "Encrypted sessions" },
  { icon: UserRoundCheck, label: "Approval queue" },
  { icon: PauseCircle, label: "Pause controls" },
  { icon: ShieldCheck, label: "GDPR-ready controls" },
];

const pricingFaqs = [
  {
    question: "How does annual billing work?",
    answer:
      "Annual pricing shows 2 months free and routes to the annual Razorpay subscription plan when the annual USD plan IDs are configured.",
  },
  {
    question: "Can I review content first?",
    answer:
      "Yes. Review mode is designed for posts, comments, and connection actions before live execution.",
  },
  {
    question: "Can I cancel or pause?",
    answer:
      "You can pause automation from the app at any time. Subscription cancellation follows the active Razorpay billing flow for your account.",
  },
  {
    question: "Is FollowerSpike affiliated with LinkedIn?",
    answer: "No. FollowerSpike is independent and is not affiliated with, endorsed by, or certified by LinkedIn.",
  },
  {
    question: "Does automation carry platform risk?",
    answer:
      "Yes. FollowerSpike reduces risk with consent, review, caps, timing windows, logs, and pause behavior, but it cannot guarantee platform outcomes.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#191919]">
      <MarketingHeader />

      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-wide text-[#0A66C2]">Simple pricing</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight text-[#191919]">Founder presence for less than a ghostwriter call.</h1>
          <p className="mt-5 text-lg leading-8 text-[#555]">
            Start with Review mode, prove the voice, then turn on risk-managed autopilot when you are comfortable.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={ROUTES.audit}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#111827] px-7 text-base font-black text-white hover:bg-[#0A66C2]"
            >
              Get Free Audit
            </Link>
            <Link
              href="/tools/followerspike-vs-hiring-a-linkedin-agency"
              className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-7 text-base font-black text-[#111827] hover:text-[#0A66C2]"
            >
              Compare With Agencies
            </Link>
          </div>
        </div>

        <div className="mb-8 grid gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-xl bg-[#f7f4ee] p-3 text-sm font-black text-[#111827]">
              <item.icon className="h-5 w-5 text-[#0A66C2]" />
              {item.label}
            </div>
          ))}
        </div>

        <PricingCards />

        <section className="mt-14 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl border border-black/10 bg-[#111827] p-6 text-white">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">Automation risk</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">What autopilot does and does not do.</h2>
            <p className="mt-4 leading-7 text-slate-300">
              FollowerSpike helps draft, score, queue, and review LinkedIn growth actions. It does not claim LinkedIn
              endorsement, bypass challenges, or guarantee account outcomes.
            </p>
            <Link
              href={ROUTES.trust}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-[#111827] hover:bg-cyan-100"
            >
              Read Trust Center
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Review-first queues before live action",
              "Human-speed timing and daily caps",
              "Pause controls and consent history",
              "No LinkedIn affiliation or certification claim",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-sm font-bold leading-6 text-[#4b5563]">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0A66C2]">Pricing FAQ</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-[#191919]">Clear answers before checkout.</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {pricingFaqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
                <h3 className="font-black text-[#111827]">{faq.question}</h3>
                <p className="mt-3 text-sm leading-6 text-[#555]">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0A66C2]">High-intent guides</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ["LinkedIn autopilot", "/linkedin-autopilot"],
              ["LinkedIn profile audit", "/linkedin-profile-audit"],
              ["LinkedIn ghostwriter", "/linkedin-ghostwriter"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl border border-black/10 bg-[#f7f4ee] p-4 text-sm font-black text-[#111827] hover:text-[#0A66C2]"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>

        <p className="mx-auto mt-10 max-w-4xl text-center text-sm leading-6 text-[#666]">{TRUST_DISCLAIMER}</p>
      </main>
      <MarketingFooter />
    </div>
  );
}

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
    "FollowerSpike pricing for founders, SMB owners, coaches, consultants, and personal brands who want LinkedIn posts, engagement, connections, and follow-up DMs on autopilot.",
};

const trustItems = [
  { icon: LockKeyhole, label: "Encrypted sessions" },
  { icon: UserRoundCheck, label: "Approval queue" },
  { icon: PauseCircle, label: "Pause controls" },
  { icon: ShieldCheck, label: "GDPR-ready controls" },
];

const includedFeatures = [
  "AI posts in your voice",
  "Daily likes, comments, and connection queue",
  "Relevance scoring for industry conversations",
  "USD monthly and annual checkout",
  "Accepted-connection follow-up DMs",
  "Trust, security, robots, sitemap, and llms.txt pages",
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
      "Yes. Review mode is designed for posts, likes, comments, connection requests, and accepted-connection follow-up DMs before live execution.",
  },
  {
    question: "Can I cancel or pause?",
    answer:
      "You can pause autopilot from the app at any time. Subscription cancellation follows the active Razorpay billing flow for your account.",
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
        <div className="mx-auto mb-12 max-w-4xl text-center">
          <p className="text-sm font-black uppercase text-[#0A66C2]">Pricing</p>
          <h1 className="mt-3 text-5xl font-black text-[#191919] sm:text-6xl">
            LinkedIn growth autopilot priced for founders and personal brands.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#555]">
            Start with AI posts, upgrade to a daily growth queue, then let Pro run conservative autopilot when you are ready.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/free-tools/linkedin-profile-audit"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#111827] px-7 text-base font-black text-white hover:bg-[#0A66C2]"
            >
              Get Free Audit
            </Link>
            <Link
              href="/compare/linkedin-agency-vs-followerspike"
              className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-7 text-base font-black text-[#111827] hover:text-[#0A66C2]"
            >
              Compare With Agencies
            </Link>
          </div>
          <p className="mt-3 text-sm font-semibold text-[#6b7280]">Essentials $9. Growth $29. Pro $49. Monthly or annual USD billing.</p>
        </div>

        <div className="mb-8 grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-xl bg-[#f7f4ee] p-3 text-sm font-black text-[#111827]">
              <item.icon className="h-5 w-5 text-[#0A66C2]" />
              {item.label}
            </div>
          ))}
        </div>

        <section className="mb-8 rounded-lg border border-black/10 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black uppercase text-[#0A66C2]">Every plan includes</p>
              <h2 className="mt-2 text-3xl font-black text-[#191919]">From content to account growth.</h2>
            </div>
            <Link
              href="/free-tools/linkedin-profile-audit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#111827] px-5 text-sm font-black text-white hover:bg-[#0A66C2]"
            >
              Try the Free Audit
            </Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {includedFeatures.map((feature) => (
              <div key={feature} className="flex items-start gap-3 rounded-xl border border-black/10 bg-[#f7f4ee] p-4 text-sm font-bold leading-6 text-[#374151]">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                {feature}
              </div>
            ))}
          </div>
        </section>

        <PricingCards />

        <section className="mt-14 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-lg border border-black/10 bg-[#111827] p-6 text-white">
            <p className="text-sm font-black uppercase text-cyan-200">Autopilot boundaries</p>
            <h2 className="mt-3 text-3xl font-black">What FollowerSpike runs for you.</h2>
            <p className="mt-4 leading-7 text-slate-300">
              FollowerSpike can draft posts, queue likes and comments, suggest connection requests, and follow up with
              accepted connections. It does not claim LinkedIn endorsement, bypass challenges, or guarantee account outcomes.
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
              <div key={item} className="flex gap-3 rounded-lg border border-black/10 bg-white p-5 shadow-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-sm font-bold leading-6 text-[#4b5563]">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase text-[#0A66C2]">Pricing FAQ</p>
            <h2 className="mt-3 text-4xl font-black text-[#191919]">Clear answers before checkout.</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {pricingFaqs.map((faq) => (
              <div key={faq.question} className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
                <h3 className="font-black text-[#111827]">{faq.question}</h3>
                <p className="mt-3 text-sm leading-6 text-[#555]">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-lg border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase text-[#0A66C2]">High-intent guides</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ["LinkedIn autopilot", "/linkedin-autopilot"],
              ["Free LinkedIn tools", "/free-tools"],
              ["Ghostwriter comparison", "/compare/ghostwriter-vs-linkedin-autopilot"],
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

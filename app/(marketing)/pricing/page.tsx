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
  { icon: UserRoundCheck, label: "Review queue" },
  { icon: PauseCircle, label: "Pause anytime" },
  { icon: ShieldCheck, label: "Consent first" },
] as const;

const proBoundaries = [
  "Posts, likes, comments, connection requests, and accepted-connection follow-ups",
  "Daily caps, local timing windows, activity logs, and auto-pause behavior",
  "No cold DM blasts, challenge bypass, fake engagement pods, or mass scraping",
  "Independent product, not affiliated with or endorsed by LinkedIn",
] as const;

const pricingFaqs = [
  {
    question: "Which plan should I start with?",
    answer: "Start with Essentials if you only need posts. Choose Growth for a review-first growth queue. Choose Pro when you want conservative live autopilot after consent.",
  },
  {
    question: "Can I review content before anything happens?",
    answer: "Yes. Review mode is the default and can stay on for posts, comments, connection requests, and follow-up DMs.",
  },
  {
    question: "How does annual billing work?",
    answer: "Annual billing uses USD annual plans and shows two months free when the annual Razorpay plan IDs are configured.",
  },
  {
    question: "Can I pause or cancel?",
    answer: "You can pause autopilot inside the app at any time. Subscription cancellation follows the active Razorpay billing flow for your account.",
  },
] as const;

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />

      <main>
        <section className="relative overflow-hidden border-b border-slate-100">
          <div className="absolute inset-x-0 top-0 h-full bg-[linear-gradient(90deg,rgba(47,128,237,0.10)_0%,rgba(47,128,237,0.03)_20%,transparent_50%,rgba(47,128,237,0.08)_100%)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-sm font-black uppercase tracking-wide text-[#2f80ed]">Pricing</p>
              <h1 className="mt-3 text-5xl font-black leading-[0.98] tracking-tight text-slate-950 sm:text-6xl">
                Simple pricing for LinkedIn growth.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Start with posts, upgrade to a review-first growth queue, and unlock live autopilot in Pro.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/free-tools/spike-rank-linkedin"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#2f80ed] px-7 text-base font-black text-white shadow-[0_16px_40px_rgba(47,128,237,0.28)] hover:bg-[#176fd6]"
                >
                  Get free audit
                </Link>
                <Link
                  href="/compare/linkedin-agency-vs-followerspike"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-7 text-base font-black text-slate-950 hover:border-[#2f80ed]/40 hover:text-[#2f80ed]"
                >
                  Compare options
                </Link>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-500">Essentials $9. Growth $29. Pro $49. Monthly or annual USD billing.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <PricingCards />

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-full border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm font-black text-slate-800">
                <item.icon className="h-5 w-5 text-[#2f80ed]" />
                {item.label}
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-100 bg-[#f8fbff] py-16">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-8">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-[#2f80ed]">Autopilot boundaries</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                Powerful enough to save time. Conservative enough to stay in control.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                FollowerSpike is built for visible account growth, not spammy lead generation. Live actions need consent, limits, logs, and pause controls.
              </p>
              <Link href={ROUTES.trust} className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-7 text-base font-black text-white hover:bg-[#2f80ed]">
                Read Trust Center
              </Link>
            </div>
            <div className="grid gap-3">
              {proBoundaries.map((item) => (
                <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2f80ed]" />
                  <p className="text-sm font-bold leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-wide text-[#2f80ed]">FAQ</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Clear answers before checkout.</h2>
          </div>
          <div className="mt-8 grid gap-3">
            {pricingFaqs.map((faq) => (
              <div key={faq.question} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-black text-slate-950">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {[
              ["LinkedIn autopilot", "/linkedin-autopilot"],
              ["Free LinkedIn tools", "/free-tools"],
              ["Ghostwriter comparison", "/compare/ghostwriter-vs-linkedin-autopilot"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="rounded-lg border border-slate-200 bg-[#f8fbff] p-4 text-sm font-black text-slate-950 hover:text-[#2f80ed]">
                {label}
              </Link>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-4xl text-center text-xs leading-6 text-slate-500">{TRUST_DISCLAIMER}</p>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

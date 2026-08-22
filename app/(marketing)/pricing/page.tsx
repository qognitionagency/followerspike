import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, LockKeyhole, PauseCircle, ShieldCheck, UserRoundCheck } from "@/components/icons";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { PricingCards } from "@/components/marketing/PricingCards";
import { ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "FollowerSpike pricing for founders, SMB owners, coaches, consultants, and personal brands who publish to X, LinkedIn, and Bluesky from one composer, with drafts in their own voice and a review queue in front of everything.",
  alternates: { canonical: "/pricing" },
};

const trustItems = [
  { icon: LockKeyhole, label: "Encrypted credentials" },
  { icon: UserRoundCheck, label: "Review queue" },
  { icon: PauseCircle, label: "Pause anytime" },
  { icon: ShieldCheck, label: "Consent first" },
] as const;

const proBoundaries = [
  "Posts and threads published to X, LinkedIn, and Bluesky through each platform's official API",
  "Post-publish automations that only ever act on your own posts: first comment, auto-plug, cross-post relay, evergreen recycling, and keyword capture",
  "Daily caps, quiet hours in your timezone, an activity log of every automated action, and auto-pause on repeated errors",
  "No likes, follows, connection requests, or DMs. Keyword capture answers by email, never by direct message",
  "Independent product, not affiliated with or endorsed by X, LinkedIn, or Bluesky",
] as const;

const pricingFaqs = [
  {
    question: "Which plan should I start with?",
    answer: "Start with Starter if you mainly want to post consistently on all three platforms. Choose Pro when you want your voice cloned from your best posts, growth plans written into your queue, and the post-publish automations. Choose Agency when you run several founder accounts.",
  },
  {
    question: "Can I review content before anything happens?",
    answer: "Yes. The review queue is the default. Drafts and scheduled posts wait for your approval, and every automation ships turned off and in simulation mode until you turn it on.",
  },
  {
    question: "Does any plan send DMs or connection requests?",
    answer: "No. FollowerSpike does not send direct messages, connection requests, follows, or likes on any plan. Automations act only on your own posts, and a keyword capture sends the lead magnet by email to an address the person replies with.",
  },
  {
    question: "How does annual billing work?",
    answer: "Annual billing uses USD annual plans and shows two months free when the annual Razorpay plan IDs are configured.",
  },
  {
    question: "Can I pause or cancel?",
    answer: "You can pause a single account or stop everything with the global switch inside the app at any time. Subscription cancellation follows the active Razorpay billing flow for your account.",
  },
] as const;

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />

      <main>
        <section className="relative overflow-hidden border-b border-slate-100">
          <div className="absolute inset-x-0 top-0 h-px bg-[#D6D6D6]" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-sm font-black uppercase tracking-wide text-[#2f80ed]">Pricing</p>
              <h1 className="mt-3 text-5xl font-black leading-[0.98] tracking-tight text-slate-950 sm:text-6xl">
                Simple pricing for three platforms.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                One composer for X, LinkedIn, and Bluesky. Drafts in your own modelled voice, a Spike Rank audit that names the fixes, and a review queue in front of everything.
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
              <p className="mt-4 text-sm font-semibold text-slate-500">Starter $19. Pro $39. Agency $79. Monthly or annual USD billing.</p>
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
              <p className="text-sm font-black uppercase tracking-wide text-[#2f80ed]">What is in scope</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                Enough automation to save time. Narrow enough to stay yours.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                FollowerSpike publishes and reads through the official API of each platform. Nothing runs on a post that is not yours, and every live action needs your consent, stays inside daily caps, and lands in the activity log.
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

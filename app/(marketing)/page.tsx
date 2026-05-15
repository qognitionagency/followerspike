import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSearch,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  PauseCircle,
  Radar,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MotionReveal } from "@/components/marketing/MotionReveal";
import { SignupButton } from "@/components/marketing/SignupButton";
import { BRAND, PRICING, ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";

const siteUrl = process.env.APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: {
    absolute: "FollowerSpike | LinkedIn Growth Autopilot for Founders and Experts",
  },
  description:
    "FollowerSpike helps founders, CEOs, consultants, agencies, and professionals turn LinkedIn into a daily growth channel with posts, comments, connections, review workflows, and safety controls.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "FollowerSpike | LinkedIn Growth Autopilot",
    description:
      "Premium LinkedIn presence software for consistent posts, relevant comments, targeted connections, and founder-safe approval workflows.",
    url: siteUrl,
    siteName: BRAND.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FollowerSpike | LinkedIn Growth Autopilot",
    description:
      "Build a consistent LinkedIn presence with AI-assisted posts, comments, connections, and review-first automation.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const audiences = [
  {
    title: "Founders and CEOs",
    body: "Keep your market warm with founder-tone posts, useful comments, and the right people added to your orbit.",
    icon: Users,
  },
  {
    title: "Consultants and agencies",
    body: "Turn expertise into a visible point of view without living inside LinkedIn every morning.",
    icon: Layers3,
  },
  {
    title: "Operators and professionals",
    body: "Build authority in a narrow niche with a repeatable cadence, review controls, and profile-led positioning.",
    icon: BadgeCheck,
  },
];

const workflow = [
  "Profile and voice audit",
  "Daily content queue",
  "Relevance-scored comments",
  "Targeted connection workflow",
  "Approval, pause, and activity logs",
];

const productStats = [
  ["30 sec", "daily review"],
  ["9am-6pm", "timezone window"],
  ["AES-256", "session encryption"],
  ["14 days", "trial runway"],
];

const seoSignals = [
  { icon: FileSearch, title: "Indexable by design", body: "Server-rendered copy, canonical metadata, sitemap coverage, and internal links from the footer." },
  { icon: BrainCircuit, title: "LLM-readable facts", body: "Clear product summaries, use cases, trust notes, FAQs, and llms.txt for answer engines." },
  { icon: BookOpenCheck, title: "EEAT structure", body: "Transparent safety model, legal pages, privacy controls, pricing signals, and grounded claims." },
];

const safetyControls = [
  { icon: Clock3, title: "Human-speed timing", body: "Randomized delays and user-timezone windows keep the workflow measured." },
  { icon: ShieldCheck, title: "Risk-managed execution", body: "Daily caps, relevance scoring, review defaults, and conservative automation paths." },
  { icon: PauseCircle, title: "Circuit breakers", body: "Auto-pause behavior for repeated errors, login challenges, CAPTCHA, or checkpoints." },
  { icon: LockKeyhole, title: "Founder Trust Stack", body: "Encrypted sessions, consent history, audit logs, privacy controls, and trust documentation." },
];

const faqs = [
  {
    question: "What is FollowerSpike?",
    answer:
      "FollowerSpike is LinkedIn growth software that helps founders, executives, consultants, agencies, and professionals create posts, review comments, manage connection workflows, and keep a consistent presence.",
  },
  {
    question: "Is FollowerSpike an autopilot or a ghostwriter?",
    answer:
      "It is both a content workflow and a risk-managed automation layer. New users start with review-first queues, then can choose how much execution they want to automate.",
  },
  {
    question: "Is FollowerSpike affiliated with LinkedIn?",
    answer:
      "No. FollowerSpike is independent and is not affiliated with, endorsed by, or certified by LinkedIn.",
  },
  {
    question: "Can I review content before anything goes live?",
    answer:
      "Yes. Review mode is designed for founders and teams who want control over posts, comments, and connection actions before execution.",
  },
];

const proofExamples = [
  {
    title: "Daily queue snapshot",
    before: "No post idea, no target list, scattered comments.",
    after: "One post draft, three comment opportunities, and a focused connection list ready for review.",
  },
  {
    title: "Positioning cleanup",
    before: "Fractional operator helping businesses grow.",
    after: "Fractional revenue operator for B2B founders who need repeatable LinkedIn-led pipeline.",
  },
  {
    title: "Founder workflow",
    before: "45 minutes of blank-page writing.",
    after: "Review queue in 30 seconds, edit the sharpest line, approve the day.",
  },
];

const comparisonRows = [
  ["Daily consistency", true, false, false, false],
  ["Founder voice learning", true, true, true, false],
  ["Comments and network workflow", true, false, true, false],
  ["Review-first control", true, true, false, true],
  ["Lower cost than human retainer", true, false, false, true],
];

const automationScope = [
  ["Does", "Draft posts, score relevant comments, organize target lists, queue actions for review, and enforce safety controls."],
  ["Does not", "Claim LinkedIn endorsement, guarantee outcomes, bypass platform challenges, or hide automation risk."],
  ["You control", "Approval mode, pause controls, target lists, profile inputs, session deletion, and how much execution goes live."],
];

function JsonLd() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: BRAND.name,
      url: siteUrl,
      description: BRAND.promise,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: BRAND.name,
      url: siteUrl,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/tools/{search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: BRAND.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: siteUrl,
      description:
        "LinkedIn growth autopilot for posts, comments, connections, approval workflows, and safety controls.",
      offers: PRICING.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        price: plan.monthlyUsd.replace("$", ""),
        priceCurrency: "USD",
        url: `${siteUrl}${ROUTES.pricing}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}

function ProductConsole() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-[#101820] p-3 shadow-2xl shadow-[#04233f]/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.22),transparent_32%),radial-gradient(circle_at_90%_0%,rgba(250,204,21,0.18),transparent_30%)]" />
      <div className="relative rounded-[22px] border border-white/10 bg-[#071116]/92 p-4 text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-200">Tomorrow's queue</p>
            <p className="mt-1 text-lg font-black">Founder presence cockpit</p>
          </div>
          <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-200">Review on</span>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_0.82fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-cyan-100">
              <MessageSquareText className="h-4 w-4" />
              Post draft
            </div>
            <p className="mt-4 text-2xl font-black leading-tight">
              Consistency is not posting more. It is showing up with a sharper point of view every day.
            </p>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Drafted from your profile audit, ICP, current offers, and approved voice notes.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Approve", "Edit", "Regenerate"].map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            {[
              ["Comment fit", "94%", "on ICP posts"],
              ["Connection list", "18", "founders queued"],
              ["Safety state", "Calm", "caps respected"],
            ].map(([label, value, note]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
                <p className="mt-1 text-sm text-slate-300">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f4ee] text-[#141414]">
      <JsonLd />
      <MarketingHeader />

      <main>
        <section className="relative">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(10,102,194,0.14),transparent_36%),linear-gradient(45deg,rgba(245,158,11,0.13),transparent_44%)]" />
          <div className="absolute left-1/2 top-0 -z-10 h-[620px] w-[960px] -translate-x-1/2 rounded-full bg-white/55 blur-3xl" />
          <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-24 lg:pt-20">
            <MotionReveal className="flex flex-col justify-center">
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-sm font-black text-[#0a66c2] shadow-sm">
                <Sparkles className="h-4 w-4" />
                LinkedIn growth autopilot, built for people with real reputations
              </div>
              <h1 className="max-w-5xl text-5xl font-black leading-[0.94] tracking-tight text-[#111827] sm:text-6xl lg:text-7xl">
                Turn your expertise into a LinkedIn growth engine.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#3f3f46]">
                FollowerSpike helps founders, CEOs, consultants, agencies, and ambitious professionals publish sharper
                posts, leave relevant comments, grow the right network, and stay in control with review-first automation.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <SignupButton className="h-12 rounded-full bg-[#111827] px-7 text-base font-black text-white hover:bg-[#0a66c2]">
                  Start {BRAND.trialDays}-Day Trial
                  <ArrowRight className="h-4 w-4" />
                </SignupButton>
                <Link
                  href={ROUTES.audit}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-7 text-base font-black text-[#111827] shadow-sm transition hover:border-[#0a66c2]/30 hover:text-[#0a66c2]"
                >
                  Get Free Profile Audit
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
                {productStats.map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-black/10 bg-white/75 p-3 shadow-sm">
                    <p className="text-xl font-black text-[#111827]">{value}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#5b5b5b]">{label}</p>
                  </div>
                ))}
              </div>
            </MotionReveal>
            <MotionReveal delay={0.12} className="relative">
              <div className="absolute -left-6 top-10 hidden rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-black shadow-xl lg:block motion-safe:animate-[float_6s_ease-in-out_infinite]">
                <Radar className="mr-2 inline h-4 w-4 text-[#0a66c2]" />
                ICP signals found
              </div>
              <div className="absolute -right-4 bottom-16 hidden rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-black shadow-xl lg:block motion-safe:animate-[float_7s_ease-in-out_infinite_1s]">
                <Zap className="mr-2 inline h-4 w-4 text-amber-500" />
                Queue ready
              </div>
              <ProductConsole />
            </MotionReveal>
          </div>
        </section>

        <section className="border-y border-black/10 bg-[#111827] text-white">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-3 lg:px-8">
            {audiences.map((item) => (
              <div key={item.title} className="flex gap-3">
                <item.icon className="mt-1 h-5 w-5 shrink-0 text-cyan-200" />
                <div>
                  <h2 className="font-black">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="product" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <MotionReveal className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0a66c2]">The operating system</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-[#111827] sm:text-5xl">
                Daily visibility without daily chaos.
              </h2>
              <p className="mt-5 text-lg leading-8 text-[#4b5563]">
                The product is built around a simple loop: learn your positioning, draft the right actions, let you review,
                then execute with conservative controls.
              </p>
            </div>
            <div className="grid gap-3">
              {workflow.map((item, index) => (
                <div key={item} className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef6ff] text-sm font-black text-[#0a66c2]">
                    0{index + 1}
                  </span>
                  <span className="font-black text-[#111827]">{item}</span>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
              ))}
            </div>
          </MotionReveal>
        </section>

        <section className="border-y border-black/10 bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <MotionReveal className="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0a66c2]">Proof without pretending</p>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-[#111827] sm:text-5xl">
                  See the kind of work the system produces.
                </h2>
                <p className="mt-5 text-lg leading-8 text-[#4b5563]">
                  These are anonymized workflow examples, not inflated customer claims. The promise is a tighter daily
                  operating rhythm for LinkedIn: better inputs, clearer positioning, and fewer blank-page mornings.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={ROUTES.audit}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#111827] px-7 text-base font-black text-white transition hover:bg-[#0a66c2]"
                  >
                    Run the Free Audit
                  </Link>
                  <Link
                    href={ROUTES.pricing}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-7 text-base font-black text-[#111827] transition hover:text-[#0a66c2]"
                  >
                    Compare Plans
                  </Link>
                </div>
              </div>
              <div className="grid gap-4">
                {proofExamples.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-black/10 bg-[#f7f4ee] p-5">
                    <h3 className="font-black text-[#111827]">{item.title}</h3>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-red-100 bg-white p-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">Before</p>
                        <p className="mt-2 text-sm leading-6 text-[#4b5563]">{item.before}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-white p-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">After</p>
                        <p className="mt-2 text-sm leading-6 text-[#4b5563]">{item.after}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </MotionReveal>
          </div>
        </section>

        <section id="seo" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <MotionReveal>
              <div className="max-w-3xl">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0a66c2]">SEO, EEAT, and LLM discovery</p>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-[#111827] sm:text-5xl">
                  Built to be understood by buyers and crawlers.
                </h2>
                <p className="mt-5 text-lg leading-8 text-[#4b5563]">
                  FollowerSpike's marketing system gives search engines and answer engines clean product facts, trust pages,
                  FAQs, internal links, pricing context, and crawlable use-case pages.
                </p>
              </div>
            </MotionReveal>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {seoSignals.map((item, index) => (
                <MotionReveal key={item.title} delay={index * 0.08} className="rounded-2xl border border-black/10 bg-[#f7f4ee] p-6">
                  <item.icon className="h-7 w-7 text-[#0a66c2]" />
                  <h3 className="mt-5 text-xl font-black text-[#111827]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#4b5563]">{item.body}</p>
                </MotionReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <MotionReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0a66c2]">Compare the alternatives</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-[#111827] sm:text-5xl">
                Software rhythm beats heroic posting.
              </h2>
              <p className="mt-5 text-lg leading-8 text-[#4b5563]">
                FollowerSpike is not trying to replace judgment. It replaces the messy daily coordination layer that makes
                expert-led LinkedIn growth inconsistent.
              </p>
            </div>
            <div className="mt-10 overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-sm">
              <div className="grid min-w-[760px] grid-cols-[1.35fr_repeat(4,0.75fr)] gap-px bg-black/10 text-sm">
                {["Capability", "FollowerSpike", "Ghostwriter", "Agency", "Manual"].map((heading) => (
                  <div key={heading} className="bg-[#111827] p-4 font-black text-white">
                    {heading}
                  </div>
                ))}
                {comparisonRows.map(([label, followerSpike, ghostwriter, agency, manual]) => (
                  <div key={String(label)} className="contents">
                    <div className="bg-white p-4 font-bold text-[#111827]">{label}</div>
                    {[followerSpike, ghostwriter, agency, manual].map((value, index) => (
                      <div key={`${label}-${index}`} className="grid place-items-center bg-white p-4">
                        {value ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-[#9ca3af]" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </MotionReveal>
        </section>

        <section id="safety" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <MotionReveal className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0a66c2]">Aggressive growth, sober controls</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-[#111827] sm:text-5xl">
                A premium presence should never feel reckless.
              </h2>
              <p className="mt-5 text-lg leading-8 text-[#4b5563]">{TRUST_DISCLAIMER}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {safetyControls.map((item) => (
                <div key={item.title} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                  <item.icon className="h-6 w-6 text-[#0a66c2]" />
                  <h3 className="mt-4 font-black text-[#111827]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4b5563]">{item.body}</p>
                </div>
              ))}
            </div>
          </MotionReveal>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <MotionReveal>
              <div className="max-w-3xl">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0a66c2]">Automation boundaries</p>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-[#111827] sm:text-5xl">
                  What autopilot does and does not do.
                </h2>
              </div>
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {automationScope.map(([title, body]) => (
                  <div key={title} className="rounded-2xl border border-black/10 bg-[#f7f4ee] p-6">
                    <h3 className="text-xl font-black text-[#111827]">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#4b5563]">{body}</p>
                  </div>
                ))}
              </div>
            </MotionReveal>
          </div>
        </section>

        <section className="bg-[#111827] px-4 py-16 text-white sm:px-6 lg:px-8">
          <MotionReveal className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">{BRAND.socialProof} building momentum</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
                Make LinkedIn feel like a system, not a guilt loop.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
                Start with a profile audit, review your first queue, and only automate when the voice and targets feel right.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <SignupButton className="h-12 rounded-full bg-white px-7 text-base font-black text-[#111827] hover:bg-cyan-100">
                Start {BRAND.trialDays}-Day Trial
              </SignupButton>
              <Link
                href={ROUTES.pricing}
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-7 text-base font-black text-white transition hover:bg-white/10"
              >
                View Pricing
              </Link>
            </div>
          </MotionReveal>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
          <MotionReveal>
            <div className="text-center">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0a66c2]">Questions buyers ask</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-[#111827]">Clear answers for search and sales.</h2>
            </div>
            <div className="mt-10 grid gap-4">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-[#111827]">{faq.question}</h3>
                  <p className="mt-3 leading-7 text-[#4b5563]">{faq.answer}</p>
                </div>
              ))}
            </div>
          </MotionReveal>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

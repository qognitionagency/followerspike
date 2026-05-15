import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSearch,
  LockKeyhole,
  MessageSquareText,
  PauseCircle,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MotionReveal } from "@/components/marketing/MotionReveal";
import { SignupButton } from "@/components/marketing/SignupButton";
import { BRAND, PRICING, ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";

const siteUrl = process.env.APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: {
    absolute: "FollowerSpike | LinkedIn Growth Software for Founders",
  },
  description:
    "FollowerSpike helps founders, CEOs, consultants, and experts build a consistent LinkedIn presence with profile audits, posts, comments, connection workflows, review mode, and safety controls.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "FollowerSpike | LinkedIn Growth Software",
    description:
      "Review-first LinkedIn growth software for consistent posts, relevant comments, targeted connections, and founder-safe controls.",
    url: siteUrl,
    siteName: BRAND.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FollowerSpike | LinkedIn Growth Software",
    description:
      "Build a consistent LinkedIn presence with profile audits, daily queues, relevant comments, and review-first automation.",
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

const heroSignals = ["Profile audit", "Daily queue", "Review mode", "Safety controls"];

const outcomes = [
  ["30 sec", "daily review"],
  ["14 days", "trial runway"],
  ["USD", "monthly or annual"],
  ["Human", "approval first"],
];

const features = [
  {
    icon: FileSearch,
    title: "Profile audit",
    body: "Turn a LinkedIn URL into a practical positioning plan with headline, about section, keyword, and content recommendations.",
  },
  {
    icon: MessageSquareText,
    title: "Daily content queue",
    body: "Create useful founder-led posts from your profile, audience, offers, and approved voice notes.",
  },
  {
    icon: UserRoundCheck,
    title: "Relevant engagement",
    body: "Score target conversations before you comment so your activity stays focused on the right audience.",
  },
  {
    icon: Users,
    title: "Targeted network growth",
    body: "Organize connection opportunities around your ICP instead of adding random people to your feed.",
  },
  {
    icon: PauseCircle,
    title: "Review and pause controls",
    body: "Keep Review mode on by default, pause execution, and choose when automation is appropriate.",
  },
  {
    icon: LockKeyhole,
    title: "Privacy controls",
    body: "Use encrypted session handling, account deletion, data export, and trust pages that explain the safety model.",
  },
];

const steps = [
  {
    title: "Audit the profile",
    body: "Start with the free profile audit to identify positioning gaps and content opportunities.",
  },
  {
    title: "Build the queue",
    body: "Review posts, comments, and connection ideas before anything becomes part of your daily routine.",
  },
  {
    title: "Approve what fits",
    body: "Keep control over voice, targeting, and risk with approval mode, caps, and pause behavior.",
  },
];

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Transparent safety model",
    body: "FollowerSpike does not claim LinkedIn endorsement or guarantee platform outcomes.",
  },
  {
    icon: FileSearch,
    title: "Crawlable trust pages",
    body: "Privacy, terms, security, DPA, subprocessors, robots, sitemap, and llms.txt are available for buyers and crawlers.",
  },
  {
    icon: Clock3,
    title: "Measured execution",
    body: "Review defaults, timing windows, daily limits, logs, and pause controls keep the product conservative by design.",
  },
];

const comparisonRows = [
  ["Daily consistency", true, false, false, false],
  ["Review-first workflow", true, true, false, true],
  ["Profile audit included", true, false, true, false],
  ["Comment and connection queue", true, false, true, false],
  ["Lower cost than a retainer", true, false, false, true],
];

const faqs = [
  {
    question: "What is FollowerSpike?",
    answer:
      "FollowerSpike is LinkedIn growth software for founders, executives, consultants, and experts who want a consistent presence without starting from a blank page every day.",
  },
  {
    question: "Can I review content before anything goes live?",
    answer:
      "Yes. Review mode is the default approach. You can approve, edit, or pause posts, comments, and connection workflows.",
  },
  {
    question: "Is FollowerSpike affiliated with LinkedIn?",
    answer:
      "No. FollowerSpike is independent and is not affiliated with, endorsed by, or certified by LinkedIn.",
  },
  {
    question: "Does automation carry risk?",
    answer:
      "Yes. Any platform automation can carry risk. FollowerSpike uses consent, review, caps, timing windows, logs, and pause behavior to reduce risk, but it cannot guarantee platform outcomes.",
  },
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
      "@type": "SoftwareApplication",
      name: BRAND.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: siteUrl,
      description:
        "LinkedIn growth software for profile audits, posts, comments, connection workflows, review mode, and safety controls.",
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

function ProductPreview() {
  return (
    <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-2xl border border-black/10 bg-white text-left shadow-sm">
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
        <div>
          <p className="text-xs font-black uppercase text-[#0A66C2]">Daily queue</p>
          <p className="mt-1 font-black text-[#111827]">Founder presence workspace</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Review mode</span>
      </div>
      <div className="grid gap-px bg-black/10 md:grid-cols-[1.2fr_0.8fr]">
        <div className="bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-black text-[#111827]">
            <MessageSquareText className="h-4 w-4 text-[#0A66C2]" />
            Post draft
          </div>
          <p className="mt-4 text-2xl font-black leading-tight text-[#111827]">
            A consistent LinkedIn presence starts with a point of view you can repeat.
          </p>
          <p className="mt-4 text-sm leading-6 text-[#4b5563]">
            Drafted from profile positioning, audience context, offer notes, and approved voice inputs.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Approve", "Edit", "Queue later"].map((item) => (
              <span key={item} className="rounded-full border border-black/10 bg-[#f7f4ee] px-3 py-1 text-xs font-bold text-[#374151]">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-px bg-black/10">
          {[
            ["Comment fit", "94%", "Relevant target post"],
            ["Connection list", "18", "ICP profiles queued"],
            ["Safety state", "Paused", "No live action without approval"],
          ].map(([label, value, note]) => (
            <div key={label} className="bg-white p-5">
              <p className="text-xs font-black uppercase text-[#6b7280]">{label}</p>
              <p className="mt-2 text-3xl font-black text-[#111827]">{value}</p>
              <p className="mt-1 text-sm text-[#4b5563]">{note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#141414]">
      <JsonLd />
      <MarketingHeader />

      <main>
        <section className="border-b border-black/10 bg-[#fbfaf7]">
          <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 text-center sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
            <MotionReveal className="mx-auto max-w-5xl">
              <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-sm font-black text-[#0A66C2] shadow-sm">
                <BadgeCheck className="h-4 w-4" />
                Review-first LinkedIn growth software
              </div>
              <div className="mx-auto mb-6 flex max-w-3xl flex-wrap justify-center gap-2">
                {heroSignals.map((signal) => (
                  <span key={signal} className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-black uppercase text-[#4b5563]">
                    {signal}
                  </span>
                ))}
              </div>
              <h1 className="mx-auto max-w-5xl text-5xl font-black leading-[0.96] text-[#111827] sm:text-6xl lg:text-7xl">
                Build a consistent LinkedIn presence without daily posting chaos.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#3f3f46]">
                FollowerSpike gives founders and experts a clean workflow for profile audits, post ideas, relevant
                comments, connection queues, and approval-first automation.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <SignupButton className="h-12 rounded-full bg-[#111827] px-7 text-base font-black text-white hover:bg-[#0A66C2]">
                  Start {BRAND.trialDays}-Day Trial
                  <ArrowRight className="h-4 w-4" />
                </SignupButton>
                <Link
                  href={ROUTES.audit}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-7 text-base font-black text-[#111827] shadow-sm transition hover:border-[#0A66C2]/30 hover:text-[#0A66C2]"
                >
                  Get Free Profile Audit
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="mt-3 text-sm font-semibold text-[#6b7280]">No commitment. Review mode first. Cancel anytime.</p>
              <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
                {outcomes.map(([value, label]) => (
                  <div key={label} className="rounded-xl border border-black/10 bg-white p-3 shadow-sm">
                    <p className="text-xl font-black text-[#111827]">{value}</p>
                    <p className="mt-1 text-xs font-bold uppercase text-[#5b5b5b]">{label}</p>
                  </div>
                ))}
              </div>
            </MotionReveal>
            <MotionReveal delay={0.08}>
              <ProductPreview />
            </MotionReveal>
          </div>
        </section>

        <section className="border-b border-black/10 bg-white">
          <div className="mx-auto grid max-w-7xl gap-px bg-black/10 px-4 py-0 sm:px-6 md:grid-cols-3 lg:px-8">
            {[
              ["Founders", "Show up consistently while staying close to the voice."],
              ["Consultants", "Turn expertise into repeatable visibility and relevant conversations."],
              ["Agencies", "Create a cleaner review workflow for executive presence."],
            ].map(([title, body]) => (
              <div key={title} className="bg-white py-6 md:px-6">
                <p className="font-black text-[#111827]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-[#4b5563]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="product" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <MotionReveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black uppercase text-[#0A66C2]">Product</p>
              <h2 className="mt-3 text-4xl font-black text-[#111827] sm:text-5xl">
                One calm workflow for LinkedIn growth.
              </h2>
              <p className="mt-5 text-lg leading-8 text-[#4b5563]">
                No bloated dashboard. No fake proof. Just the core loop: understand the profile, build the queue, review
                the work, and keep risk controls visible.
              </p>
            </div>
          </MotionReveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((item, index) => (
              <MotionReveal key={item.title} delay={index * 0.04} className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
                <item.icon className="h-6 w-6 text-[#0A66C2]" />
                <h3 className="mt-5 text-xl font-black text-[#111827]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#4b5563]">{item.body}</p>
              </MotionReveal>
            ))}
          </div>
        </section>

        <section className="border-y border-black/10 bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <MotionReveal className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <p className="text-sm font-black uppercase text-[#0A66C2]">How it works</p>
                <h2 className="mt-3 text-4xl font-black text-[#111827] sm:text-5xl">
                  Start with value before automation.
                </h2>
                <p className="mt-5 text-lg leading-8 text-[#4b5563]">
                  The funnel is simple: free audit, useful queue, review-first trial, then paid plans when the workflow
                  is clearly useful.
                </p>
                <Link
                  href={ROUTES.audit}
                  className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-[#111827] px-7 text-base font-black text-white transition hover:bg-[#0A66C2]"
                >
                  Run the Free Audit
                </Link>
              </div>
              <div className="grid gap-3">
                {steps.map((step, index) => (
                  <div key={step.title} className="grid grid-cols-[auto_1fr] gap-4 rounded-xl border border-black/10 bg-[#f7f4ee] p-5">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-sm font-black text-[#0A66C2]">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-black text-[#111827]">{step.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#4b5563]">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </MotionReveal>
          </div>
        </section>

        <section id="trust" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <MotionReveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black uppercase text-[#0A66C2]">Trust and transparency</p>
              <h2 className="mt-3 text-4xl font-black text-[#111827] sm:text-5xl">
                Built for buyers who check the details.
              </h2>
              <p className="mt-5 text-lg leading-8 text-[#4b5563]">
                Clear product claims, visible safety controls, indexable legal pages, and grounded FAQs help humans and
                answer engines understand what FollowerSpike does.
              </p>
            </div>
          </MotionReveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {trustItems.map((item) => (
              <div key={item.title} className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
                <item.icon className="h-6 w-6 text-[#0A66C2]" />
                <h3 className="mt-5 text-xl font-black text-[#111827]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#4b5563]">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {[
              ["Trust", ROUTES.trust],
              ["Security", ROUTES.security],
              ["Privacy", ROUTES.privacy],
              ["Terms", ROUTES.terms],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-black text-[#111827] hover:text-[#0A66C2]">
                {label}
              </Link>
            ))}
          </div>
        </section>

        <section className="border-y border-black/10 bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <MotionReveal>
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-sm font-black uppercase text-[#0A66C2]">Compare</p>
                <h2 className="mt-3 text-4xl font-black text-[#111827] sm:text-5xl">
                  A software workflow, not another content retainer.
                </h2>
                <p className="mt-5 text-lg leading-8 text-[#4b5563]">
                  FollowerSpike is designed for operators who want repeatable daily execution with review controls.
                </p>
              </div>
              <div className="mt-10 overflow-x-auto rounded-xl border border-black/10 bg-white shadow-sm">
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
                            <span className="h-2 w-2 rounded-full bg-[#d1d5db]" />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </MotionReveal>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <MotionReveal className="rounded-2xl border border-black/10 bg-[#111827] p-6 text-white md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-sm font-black uppercase text-cyan-200">Pricing</p>
                <h2 className="mt-3 max-w-3xl text-4xl font-black sm:text-5xl">
                  Start lean. Upgrade when the workflow earns its place.
                </h2>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
                  USD monthly and annual plans. Every plan starts with review-first controls and the free audit path.
                </p>
              </div>
              <Link
                href={ROUTES.pricing}
                className="inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-base font-black text-[#111827] transition hover:bg-cyan-100"
              >
                View Pricing
              </Link>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {PRICING.map((plan) => (
                <div key={plan.tier} className="rounded-xl border border-white/10 bg-white/[0.06] p-5">
                  <p className="font-black">{plan.name}</p>
                  <p className="mt-3 text-3xl font-black">{plan.monthlyUsd}<span className="text-sm text-slate-300">/mo</span></p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{plan.description}</p>
                </div>
              ))}
            </div>
          </MotionReveal>
        </section>

        <section className="border-t border-black/10 bg-white py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <MotionReveal>
              <div className="text-center">
                <p className="text-sm font-black uppercase text-[#0A66C2]">FAQ</p>
                <h2 className="mt-3 text-4xl font-black text-[#111827]">Clear answers for buyers and crawlers.</h2>
              </div>
              <div className="mt-10 grid gap-4">
                {faqs.map((faq) => (
                  <div key={faq.question} className="rounded-xl border border-black/10 bg-[#f7f4ee] p-6">
                    <h3 className="text-lg font-black text-[#111827]">{faq.question}</h3>
                    <p className="mt-3 leading-7 text-[#4b5563]">{faq.answer}</p>
                  </div>
                ))}
              </div>
              <p className="mx-auto mt-10 max-w-3xl text-center text-sm leading-6 text-[#666]">{TRUST_DISCLAIMER}</p>
            </MotionReveal>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

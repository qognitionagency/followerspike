import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  MessageCircle,
  PauseCircle,
  PenLine,
  Send,
  ShieldCheck,
  Target,
  UserPlus,
} from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MotionReveal } from "@/components/marketing/MotionReveal";
import { SignupButton } from "@/components/marketing/SignupButton";
import { BRAND, PRICING, ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";
import { blogPosts, freeTools } from "@/lib/marketing/content";

const siteUrl = process.env.APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: {
    absolute: "FollowerSpike | Post to X, LinkedIn, and Bluesky in Your Own Voice",
  },
  description:
    "One composer for X, LinkedIn, and Bluesky, AI that writes in your own voice, a 0-100 score for every profile, and automations that turn reach into email subscribers.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "FollowerSpike | Post to X, LinkedIn, and Bluesky in Your Own Voice",
    description:
      "Write once, publish native to all three platforms, and turn the reach into email subscribers.",
    url: siteUrl,
    siteName: BRAND.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FollowerSpike | Post to X, LinkedIn, and Bluesky in Your Own Voice",
    description: "Post to X, LinkedIn, and Bluesky from one editor, in your own voice.",
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

const workflow = [
  {
    title: "Set your growth direction",
    body: "Add your niche, ideal audience, target roles, and seed leaders once.",
    icon: Target,
  },
  {
    title: "Review the daily queue",
    body: "Approve posts, comments, connection requests, and follow-up DMs from one calm workspace.",
    icon: CalendarCheck,
  },
  {
    title: "Turn on autopilot carefully",
    body: "Pro can execute approved actions inside consent, timing, daily limits, and pause controls.",
    icon: ShieldCheck,
  },
] as const;

const features = [
  {
    title: "Posts in your voice",
    body: "Turn customer lessons, ideas, and market opinions into LinkedIn posts that sound like you.",
    icon: PenLine,
  },
  {
    title: "Relevant engagement",
    body: "Find conversations worth joining and draft useful comments without generic praise.",
    icon: MessageCircle,
  },
  {
    title: "Connection requests",
    body: "Queue right-fit people from your roles, industries, ICP, and seed leaders.",
    icon: UserPlus,
  },
  {
    title: "Follow-up DMs",
    body: "Prepare warm accepted-connection follow-ups without cold sequence behavior.",
    icon: Send,
  },
  {
    title: "Pause controls",
    body: "Keep review mode, timing windows, caps, logs, and pause controls visible.",
    icon: PauseCircle,
  },
  {
    title: "Free growth tools",
    body: "Run profile audits, headline checks, post generators, and ICP builders before signup.",
    icon: BadgeCheck,
  },
] as const;

const audiences = ["Founders", "Coaches", "Consultants", "SMB owners", "Creators", "Personal brands"] as const;

const faqs = [
  {
    question: "Is this only a LinkedIn post generator?",
    answer: "No. Posts are one part of the loop. FollowerSpike also helps with relevant engagement, connection requests, and follow-up DMs.",
  },
  {
    question: "Can I review everything first?",
    answer: "Yes. Review-first mode is the default. You can approve, edit, skip, regenerate, or keep autopilot paused.",
  },
  {
    question: "Does it run without consent?",
    answer: "No. Live execution requires explicit consent, risk acknowledgement, plan access, timing windows, limits, and pause controls.",
  },
] as const;

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
        "LinkedIn growth autopilot for posts, engagement queues, connection requests, accepted-connection follow-ups, review controls, and safety controls.",
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
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />;
}

function HeroMockup() {
  return (
    <div className="relative mx-auto mt-14 h-[520px] max-w-4xl sm:h-[600px]">
      <div className="absolute inset-x-0 top-6 mx-auto h-[500px] max-w-3xl rounded-[2rem] border-[12px] border-slate-950 bg-white shadow-[0_38px_90px_rgba(15,23,42,0.20)]" />
      <div className="absolute inset-x-6 top-16 mx-auto h-[420px] max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex h-12 items-center justify-between border-b border-slate-100 px-5">
          <span className="text-sm font-black text-slate-950">Daily queue</span>
          <span className="rounded-full bg-[#eaf3ff] px-3 py-1 text-xs font-black text-[#2f80ed]">Review first</span>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {[
            ["Post", "Founder lesson on customer trust", "Ready"],
            ["Comment", "Market conversation with 92% fit", "Approve"],
            ["Connect", "SaaS founder in your ICP", "Review"],
            ["Follow-up", "Accepted connection DM", "Draft"],
          ].map(([label, body, status]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-[#fbfdff] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#2f80ed]">{label}</span>
                <span className="text-xs font-black text-emerald-600">{status}</span>
              </div>
              <p className="mt-3 text-sm font-bold leading-6 text-slate-800">{body}</p>
            </div>
          ))}
        </div>
        <div className="mx-5 rounded-lg border border-[#b8d8ff] bg-[#f0f7ff] p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#2f80ed] text-white">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black text-slate-950">Autopilot is paused</p>
              <p className="text-xs font-semibold text-slate-600">Nothing runs until you approve the mode.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-0 top-52 hidden w-56 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_20px_55px_rgba(15,23,42,0.12)] sm:block">
        <p className="text-xs font-black uppercase text-slate-500">Profile signal</p>
        <div className="mt-4 flex items-end gap-2">
          {[34, 48, 68, 88, 54].map((height, index) => (
            <div key={height} className="flex-1 rounded-t-lg bg-[#d8eaff]" style={{ height: `${height}px` }}>
              {index === 3 ? <div className="h-full rounded-t-lg bg-[#2f80ed]" /> : null}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-black text-slate-950">65% ready</p>
      </div>

      <div className="absolute bottom-10 right-0 hidden w-60 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_20px_55px_rgba(15,23,42,0.12)] md:block">
        <p className="text-xs font-black uppercase text-[#2f80ed]">Connection note</p>
        <p className="mt-3 text-sm leading-6 text-slate-700">Saw your post on founder-led GTM. Would be glad to follow what you are building.</p>
        <div className="mt-4 h-2 rounded-full bg-slate-100">
          <div className="h-2 w-3/4 rounded-full bg-[#2f80ed]" />
        </div>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <JsonLd />
      <MarketingHeader />

      <main>
        <section className="relative overflow-hidden border-b border-slate-100">
          <div className="absolute inset-x-0 top-0 h-full bg-[linear-gradient(90deg,rgba(47,128,237,0.12)_0%,rgba(47,128,237,0.03)_18%,transparent_34%,transparent_66%,rgba(47,128,237,0.08)_100%)]" />
          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-20 lg:pt-20">
            <MotionReveal className="mx-auto max-w-4xl text-center">
              <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#cfe4ff] bg-white px-4 py-2 text-sm font-black text-[#2f80ed] shadow-sm">
                <BadgeCheck className="h-4 w-4" />
                LinkedIn growth autopilot for busy operators
              </div>
              <h1 className="mx-auto max-w-4xl text-5xl font-black leading-[0.98] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                Grow on LinkedIn while you run the business.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                FollowerSpike creates posts, finds relevant conversations, queues connection requests, and drafts follow-ups so your account keeps moving without daily manual work.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <SignupButton className="h-12 rounded-full bg-[#2f80ed] px-7 text-base font-black text-white shadow-[0_16px_40px_rgba(47,128,237,0.28)] hover:bg-[#176fd6]">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </SignupButton>
                <Link
                  href="/free-tools/spike-rank-linkedin"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 text-base font-black text-slate-950 shadow-sm transition hover:border-[#2f80ed]/40 hover:text-[#2f80ed]"
                >
                  Run free audit
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </MotionReveal>

            <HeroMockup />

            <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 text-center sm:grid-cols-3 lg:grid-cols-6">
              {audiences.map((audience) => (
                <div key={audience} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
                  {audience}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <MotionReveal>
              <p className="text-sm font-black uppercase tracking-wide text-[#2f80ed]">How it works</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                A simple daily system, not another dashboard to manage.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Set your direction once. Review the queue daily. Turn on Pro autopilot only when the workflow is ready.
              </p>
            </MotionReveal>
            <div className="relative grid gap-6">
              <div className="absolute left-5 top-8 hidden h-[calc(100%-4rem)] w-px bg-[#2f80ed]/25 sm:block" />
              {workflow.map((item, index) => (
                <MotionReveal key={item.title} delay={index * 0.06} className="relative grid gap-4 sm:grid-cols-[auto_1fr]">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#2f80ed] text-sm font-black text-white shadow-[0_12px_26px_rgba(47,128,237,0.24)]">
                    {index + 1}
                  </span>
                  <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <item.icon className="h-5 w-5 text-[#2f80ed]" />
                    <h3 className="mt-4 text-xl font-black text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                  </div>
                </MotionReveal>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="border-y border-slate-100 bg-[#f8fbff] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <MotionReveal className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black uppercase tracking-wide text-[#2f80ed]">Features</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Everything needed for LinkedIn account growth.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Content, engagement, connections, follow-ups, and controls in one clean workflow.
              </p>
            </MotionReveal>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <MotionReveal key={feature.title} delay={index * 0.04} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#eef6ff] text-[#2f80ed]">
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-xl font-black text-slate-950">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{feature.body}</p>
                </MotionReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <MotionReveal>
              <p className="text-sm font-black uppercase tracking-wide text-[#2f80ed]">Free tools</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Give users value before signup.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Run a profile audit, post generator, comment generator, ICP builder, and more. The tools are functional and return instant results.
              </p>
              <Link href="/free-tools" className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-7 text-base font-black text-white hover:bg-[#2f80ed]">
                Browse free tools
              </Link>
            </MotionReveal>
            <div className="grid gap-3 sm:grid-cols-2">
              {freeTools.slice(0, 4).map((tool) => (
                <Link key={tool.slug} href={`/free-tools/${tool.slug}`} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#2f80ed]/40 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
                  <tool.icon className="h-5 w-5 text-[#2f80ed]" />
                  <h3 className="mt-4 font-black text-slate-950">{tool.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{tool.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-y border-slate-100 bg-[#f8fbff] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <MotionReveal className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black uppercase tracking-wide text-[#2f80ed]">Pricing</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Simple plans for LinkedIn growth.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Start with content, upgrade to a growth queue, and unlock live autopilot in Pro.
              </p>
            </MotionReveal>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {PRICING.map((plan) => (
                <div
                  key={plan.tier}
                  className={plan.popular ? "rounded-lg border-2 border-[#2f80ed] bg-white p-6 shadow-[0_22px_60px_rgba(47,128,237,0.18)]" : "rounded-lg border border-slate-200 bg-white p-6 shadow-sm"}
                >
                  {plan.popular ? <p className="mb-4 text-xs font-black uppercase tracking-wide text-[#2f80ed]">Most popular</p> : null}
                  <h3 className="text-2xl font-black text-slate-950">{plan.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{plan.description}</p>
                  <p className="mt-6 text-4xl font-black text-slate-950">
                    {plan.monthlyUsd}<span className="text-base text-slate-500">/mo</span>
                  </p>
                  <ul className="mt-6 grid gap-3">
                    {plan.features.slice(0, 4).map((feature) => (
                      <li key={feature} className="flex gap-2 text-sm font-semibold text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2f80ed]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href={ROUTES.pricing} className="inline-flex h-12 items-center justify-center rounded-full bg-[#2f80ed] px-7 text-base font-black text-white hover:bg-[#176fd6]">
                View full pricing
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <MotionReveal>
              <p className="text-sm font-black uppercase tracking-wide text-[#2f80ed]">FAQ</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Clear enough to try today.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                FollowerSpike is built for account growth, not spammy lead generation.
              </p>
            </MotionReveal>
            <div className="grid gap-3">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-black text-slate-950">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden bg-[#2f80ed] text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-blue-100">Ready</p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">
                Start with one free audit. Build the queue from there.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-50">
                No live LinkedIn action happens until the user explicitly enables the right mode and safety controls.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/free-tools/spike-rank-linkedin" className="inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-base font-black text-[#2f80ed]">
                Run free audit
              </Link>
              <SignupButton className="h-12 rounded-full border border-white/25 bg-[#176fd6] px-7 text-base font-black text-white hover:bg-slate-950">
                Start for free
              </SignupButton>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-[#2f80ed]">Latest guides</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Learn the growth system.</h2>
            </div>
            <Link href="/blog" className="inline-flex text-sm font-black text-[#2f80ed]">
              Read the blog
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {blogPosts.slice(0, 3).map((post) => (
              <article key={post.slug} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-[#2f80ed]">{post.category}</p>
                <h3 className="mt-3 text-lg font-black text-slate-950">{post.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{post.description}</p>
                <Link href={`/blog/${post.slug}`} className="mt-4 inline-flex text-sm font-black text-[#2f80ed]">
                  Read guide
                </Link>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-6 text-slate-500">{TRUST_DISCLAIMER}</p>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

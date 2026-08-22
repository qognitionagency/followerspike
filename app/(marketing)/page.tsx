import { appUrl } from "@/lib/env";
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
} from "@/components/icons";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SignupButton } from "@/components/marketing/SignupButton";
import { BRAND, PRICING, ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";
import { blogPosts, freeTools } from "@/lib/marketing/content";

const siteUrl = appUrl();

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
    // Declared explicitly. Pages that set no openGraph of their own inherit the
    // root layout and Next appends the generated card automatically; a page that
    // overrides openGraph, as this one does, loses it unless it says so.
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "FollowerSpike | Post to X, LinkedIn, and Bluesky in Your Own Voice",
    description: "Post to X, LinkedIn, and Bluesky from one editor, in your own voice.",
    images: ["/opengraph-image"],
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
    title: "Teach it how you sound",
    body: "Answer the voice interview, or import posts you already wrote. It builds a voice profile you can read and edit.",
    icon: Target,
  },
  {
    title: "Write once, review everywhere",
    body: "One editor produces a native version for each platform, split into threads where they need it. Nothing leaves the queue unapproved.",
    icon: CalendarCheck,
  },
  {
    title: "Let the follow-ups run",
    body: "First comment, plug, cross-post relay, and keyword capture fire after a post goes out, inside consent, quiet hours, daily caps, and a global pause.",
    icon: ShieldCheck,
  },
] as const;

const features = [
  {
    title: "Posts in your voice",
    body: "A voice profile built from your own writing, with the exemplars and corrections that shaped it visible to you.",
    icon: PenLine,
  },
  {
    title: "One editor, three platforms",
    body: "Write once and see exactly what X, LinkedIn, and Bluesky will each publish, threaded where the platform allows it.",
    icon: Send,
  },
  {
    title: "First comment and plug",
    body: "Drop the comment you prepared under your own post, and the link hours later, when it has had time to travel.",
    icon: MessageCircle,
  },
  {
    title: "Keyword capture",
    body: "Watch the replies on your own posts for a word, and email whoever asks for the thing you offered.",
    icon: UserPlus,
  },
  {
    title: "Pause controls",
    body: "Quiet hours in your timezone, per-plan daily caps, auto-pause after repeated failures, and a stop that halts work already in flight.",
    icon: PauseCircle,
  },
  {
    title: "Free profile scores",
    body: "Score an X, Bluesky, or LinkedIn profile out of 100 before you sign up for anything.",
    icon: BadgeCheck,
  },
] as const;

const audiences = ["Founders", "Coaches", "Consultants", "SMB owners", "Creators", "Personal brands"] as const;

const faqs = [
  {
    question: "Is this only a post generator?",
    answer: "No. Posts are one part of the loop. What happens after a post goes out is the other part: the first comment, the plug, the mirror onto your other accounts, and capturing the people who reply.",
  },
  {
    question: "Can I review everything first?",
    answer: "Yes. Review-first mode is the default. You can approve, edit, skip, regenerate, or keep autopilot paused.",
  },
  {
    question: "Does it run without consent?",
    answer: "No. Live execution requires explicit consent, risk acknowledgement, plan access, timing windows, limits, and pause controls. Every automation also simulates by default, so you can watch what it would do before it does anything.",
  },
  {
    question: "Does it like, follow, or send connection requests?",
    answer: "No. Those carry real account risk and are deliberately not built. FollowerSpike publishes and reads only through each platform's official API, and only under your own posts.",
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
        "A publishing and voice tool for X, LinkedIn, and Bluesky: one composer, voice-modelled drafts, a review queue, post-publish automations, and profile scoring.",
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
          <span className="text-sm font-black text-slate-950">Review queue</span>
          <span className="rounded-full bg-[#eaf3ff] px-3 py-1 text-xs font-black text-[#2f80ed]">Review first</span>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {[
            ["X", "Founder lesson on customer trust · 1/3", "Scheduled"],
            ["LinkedIn", "Same lesson, long form, one post", "Scheduled"],
            ["First comment", "The longer write-up, under the thread", "Queued"],
            ["Plug", "Link, four hours after the post", "Waiting"],
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
              <p className="text-sm font-black text-slate-950">Automations are simulating</p>
              <p className="text-xs font-semibold text-slate-600">They record what they would do until you switch that off.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-0 top-52 hidden w-56 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_20px_55px_rgba(15,23,42,0.12)] sm:block">
        <p className="text-xs font-black uppercase text-slate-500">Spike Rank</p>
        <div className="mt-4 flex items-end gap-2">
          {[34, 48, 68, 88, 54].map((height, index) => (
            <div key={height} className="flex-1 rounded-t-lg bg-[#d8eaff]" style={{ height: `${height}px` }}>
              {index === 3 ? <div className="h-full rounded-t-lg bg-[#2f80ed]" /> : null}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-black text-slate-950">65 / 100</p>
      </div>

      <div className="absolute bottom-10 right-0 hidden w-60 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_20px_55px_rgba(15,23,42,0.12)] md:block">
        <p className="text-xs font-black uppercase text-[#2f80ed]">Captured</p>
        <p className="mt-3 text-sm leading-6 text-slate-700">Nine people replied PLAYBOOK under your post. Six left an email, and each was sent the link once.</p>
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
          <div className="absolute inset-x-0 top-0 h-px bg-[#D6D6D6]" />
          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-20 lg:pt-20">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#cfe4ff] bg-white px-4 py-2 text-sm font-black text-[#2f80ed] shadow-sm">
                <BadgeCheck className="h-4 w-4" />
One voice, three platforms, no daily grind
              </div>
              <h1 className="mx-auto max-w-4xl text-5xl font-black leading-[0.98] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
Post everywhere that matters while you run the business.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
FollowerSpike writes in your own voice, publishes native to X, LinkedIn, and Bluesky from one editor, and runs the follow-ups after the post is live: first comment, plug, cross-post, and keyword capture.
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
            </div>

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
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-[#2f80ed]">How it works</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                A simple daily system, not another dashboard to manage.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
Teach it your voice once. Review the queue. Let the automations run only when you have watched them simulate.
              </p>
            </div>
            <div className="relative grid gap-6">
              <div className="absolute left-5 top-8 hidden h-[calc(100%-4rem)] w-px bg-[#2f80ed]/25 sm:block" />
              {workflow.map((item, index) => (
                <div key={item.title} className="relative grid gap-4 sm:grid-cols-[auto_1fr]">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#2f80ed] text-sm font-black text-white shadow-[0_12px_26px_rgba(47,128,237,0.24)]">
                    {index + 1}
                  </span>
                  <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <item.icon className="h-5 w-5 text-[#2f80ed]" />
                    <h3 className="mt-4 text-xl font-black text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="border-y border-slate-100 bg-[#f8fbff] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black uppercase tracking-wide text-[#2f80ed]">Features</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
Everything between the idea and the follow-up.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
Voice, publishing, post-publish automations, lead capture, and the controls around them.
              </p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:border-[#0A66C2]">
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#eef6ff] text-[#2f80ed]">
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-xl font-black text-slate-950">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-[#2f80ed]">Free tools</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Give users value before signup.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
Score an X, Bluesky, or LinkedIn profile out of 100, split a post into a thread, rewrite it for another platform, or test a hook. Every tool runs for real and returns a result on the spot.
              </p>
              <Link href="/free-tools" className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-7 text-base font-black text-white hover:bg-[#2f80ed]">
                Browse free tools
              </Link>
            </div>
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
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black uppercase tracking-wide text-[#2f80ed]">Pricing</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
Simple plans for posting everywhere.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
Start with the composer and your voice, add the post-publish automations in Pro, and run several accounts on Agency.
              </p>
            </div>
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
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-[#2f80ed]">FAQ</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Clear enough to try today.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
FollowerSpike acts on your own posts and nobody else\u2019s.
              </p>
            </div>
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
Start with one free profile score. Build from there.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-50">
Nothing publishes until you enable automation, accept the risk acknowledgement, and take an automation out of simulation.
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

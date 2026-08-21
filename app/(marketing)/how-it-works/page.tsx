import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Gauge, PenLine, Repeat2, ShieldCheck } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The three-step FollowerSpike workflow: score where you stand, teach the voice engine how you write, then compose and schedule across X, LinkedIn, and Bluesky.",
  alternates: { canonical: "/how-it-works" },
};

const steps = [
  {
    icon: Gauge,
    title: "Score where you actually stand",
    body: "Spike Rank reads your public profile and grades it out of 100 — bio, proof, posting cadence, and the gaps costing you followers. You get a baseline before changing anything, and the score is tracked over time so you can see whether the work is landing.",
    points: ["Runs on public data, no password", "Tracked as history, not a one-off number", "Same engine as the free tool"],
  },
  {
    icon: PenLine,
    title: "Teach it how you write",
    body: "The voice engine builds a model from your niche, audience, and the way you already talk about your work — so drafts come back sounding like you, not like a language model doing LinkedIn. If you have no posts worth cloning, a short interview gets there instead.",
    points: ["Works with zero existing posts", "Tuned by your niche and audience", "You approve every draft"],
  },
  {
    icon: Repeat2,
    title: "Compose once, publish native",
    body: "One editor, three platforms. The composer tracks each platform's limits as you type — 280 characters on X, 300 on Bluesky, 3,000 on LinkedIn — and previews the real thing: thread splits, truncation points, and where a link preview lands. Approved posts go to a schedule you control.",
    points: ["Per-platform previews", "Thread builder", "Review queue before anything ships"],
  },
];

function HowItWorksJsonLd() {
  const siteUrl = process.env.APP_URL || "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How FollowerSpike works",
    description:
      "Score your profile, train the voice engine, then compose and schedule across X, LinkedIn, and Bluesky.",
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.body,
      url: `${siteUrl}/how-it-works#step-${index + 1}`,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#111827]">
      <HowItWorksJsonLd />
      <MarketingHeader />
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <section className="max-w-3xl">
          <p className="text-sm font-black uppercase text-[#0a66c2]">How it works</p>
          <h1 className="mt-3 text-5xl font-black sm:text-6xl">
            Three steps, then it is a fifteen-minute habit.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[#4b5563]">
            Most founder growth advice asks you to post daily and figure out the rest. This is the
            shorter version: find out where you stand, teach the system your voice, and write once
            for all three platforms.
          </p>
        </section>

        <section className="mt-14 grid gap-4 lg:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              id={`step-${index + 1}`}
              className="flex flex-col rounded-lg border border-[#d8d2c4] bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-md bg-[#111827] text-sm font-black text-white">
                  {index + 1}
                </span>
                <step.icon className="h-6 w-6 text-[#0a66c2]" />
              </div>
              <h2 className="mt-5 text-xl font-black text-[#111827]">{step.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-[#4b5563]">{step.body}</p>
              <div className="mt-5 grid gap-2">
                {step.points.map((point) => (
                  <div key={point} className="flex items-center gap-2 text-sm font-bold text-[#111827]">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    {point}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-14 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-[#d8d2c4] bg-white p-8 shadow-sm">
            <ShieldCheck className="h-8 w-8 text-[#0a66c2]" />
            <h2 className="mt-5 text-2xl font-black text-[#111827]">What it will not do</h2>
            <p className="mt-3 text-sm leading-6 text-[#4b5563]">
              Nothing publishes without your approval, and nothing runs outside the caps and quiet
              hours you set. Automation is opt-in, pausable at any time, and every action is written
              to a log you can read.
            </p>
            <Link
              href="/features/safety-controls"
              className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#0a66c2]"
            >
              Read the safety controls
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-lg border border-[#d8d2c4] bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-black text-[#111827]">Start at step one</h2>
            <p className="mt-3 text-sm leading-6 text-[#4b5563]">
              Spike Rank is free and needs no account. Score your profile, then decide whether the
              rest is worth it.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/free-tools"
                className="inline-flex h-12 items-center justify-center rounded-md bg-[#111827] px-7 text-base font-black text-white hover:bg-[#0a66c2]"
              >
                Score my profile free
              </Link>
              <Link
                href={ROUTES.pricing}
                className="inline-flex h-12 items-center justify-center rounded-md border border-[#d8d2c4] bg-white px-7 text-base font-black text-[#111827] hover:text-[#0a66c2]"
              >
                See pricing
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

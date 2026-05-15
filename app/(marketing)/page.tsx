import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  PauseCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { SignupButton } from "@/components/marketing/SignupButton";
import { BRAND, ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "LinkedIn Autopilot for Founders",
  description:
    "Stop being invisible on LinkedIn. FollowerSpike creates relevant posts, comments, and connections for founders, CEOs, consultants, and executives.",
};

const proofPoints = [
  "Built for founders, CEOs, consultants, and executives",
  "Review your daily queue in 30 seconds",
  "Approval mode on by default",
  "Encrypted LinkedIn sessions",
  "GDPR-ready privacy controls",
  "Pause automation anytime",
];

const safetyControls = [
  { icon: Clock3, title: "Human-speed timing", body: "45s-4min randomized delays and 9am-6pm user-timezone windows." },
  { icon: ShieldCheck, title: "Risk-managed execution", body: "Daily caps, relevance scoring, and first-week review mode." },
  { icon: PauseCircle, title: "Circuit breakers", body: "Auto-pause after repeated errors, login challenges, CAPTCHA, or checkpoints." },
  { icon: LockKeyhole, title: "Founder Trust Stack", body: "AES-256 encrypted sessions, RLS, consent history, and audit logs." },
];

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-[#F4F2EE] text-[#191919]">
      <header className="sticky top-0 z-50 border-b border-[#D6D6D6] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href={ROUTES.home} className="flex items-center gap-2 font-black tracking-tight text-[#0A66C2]">
            <TrendingUp className="h-6 w-6" />
            {BRAND.name}
          </Link>
          <nav className="ml-auto hidden items-center gap-6 text-sm font-medium text-[#666] md:flex">
            <Link href={ROUTES.audit} className="hover:text-[#191919]">
              Free Audit
            </Link>
            <Link href={ROUTES.pricing} className="hover:text-[#191919]">
              Pricing
            </Link>
            <Link href={ROUTES.trust} className="hover:text-[#191919]">
              Trust
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 md:ml-6">
            <Link href={ROUTES.login} className="hidden text-sm font-semibold text-[#666] hover:text-[#191919] sm:inline">
              Login
            </Link>
            <SignupButton className="rounded-full bg-[#0A66C2] px-5 font-semibold text-white hover:bg-[#004182]">
              Start 14-Day Trial
            </SignupButton>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#BFD7F0] bg-white px-3 py-1 text-sm font-semibold text-[#0A66C2]">
              <Sparkles className="h-4 w-4" />
              {BRAND.promise}
            </div>
            <h1 className="max-w-4xl text-5xl font-black tracking-tight text-[#191919] sm:text-6xl lg:text-7xl">
              Stop being invisible on LinkedIn.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#444]">
              FollowerSpike turns your LinkedIn into a daily growth channel with founder-tone posts,
              relevance-scored comments, and targeted connection workflows you can review in 30 seconds.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <SignupButton className="h-12 rounded-full bg-[#0A66C2] px-7 text-base font-bold text-white hover:bg-[#004182]">
                Start 14-Day Trial
                <ArrowRight className="h-4 w-4" />
              </SignupButton>
              <Link
                href={ROUTES.audit}
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#D6D6D6] bg-white px-7 text-base font-bold text-[#191919] hover:bg-[#EEF3F8]"
              >
                Get Free Profile Audit
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-[#555]">
              {proofPoints.slice(0, 3).map((point) => (
                <span key={point} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#0A66C2]" />
                  {point}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#D6D6D6] bg-white p-4 shadow-sm">
            <div className="rounded-lg border border-[#D6D6D6] bg-[#F8FAFC] p-4">
              <div className="flex items-center justify-between border-b border-[#D6D6D6] pb-3">
                <div>
                  <p className="text-sm font-bold text-[#191919]">Tomorrow at 10:14 AM</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#0A66C2]">Post queued</p>
                </div>
                <span className="rounded-full bg-[#E7F3FF] px-3 py-1 text-xs font-bold text-[#0A66C2]">Review</span>
              </div>
              <p className="mt-4 text-lg font-semibold leading-8 text-[#191919]">
                Most founders do not have a content problem. They have a consistency problem.
              </p>
              <p className="mt-3 text-sm leading-6 text-[#555]">
                One useful post. One thoughtful comment. One relevant connection. Done daily, that compounds faster
                than another weekend spent rewriting a content strategy.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {["Approve", "Edit", "Skip", "Regenerate"].map((action) => (
                  <button
                    key={action}
                    className="rounded-full border border-[#D6D6D6] bg-white px-3 py-2 text-sm font-bold text-[#191919]"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["Warmer network", "Daily comments on relevant people"],
                ["Founder voice", "Posts learn from your tone"],
                ["Safety controls", "Caps, windows, pauses, logs"],
              ].map(([title, body]) => (
                <div key={title} className="rounded-lg border border-[#E2E2E2] bg-white p-3">
                  <p className="font-bold text-[#191919]">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-[#666]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#D6D6D6] bg-white">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-6 lg:px-8">
            {proofPoints.map((point) => (
              <div key={point} className="flex items-start gap-2 text-sm font-semibold text-[#333]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0A66C2]" />
                {point}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-wide text-[#0A66C2]">Aggressive growth, sober controls</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-[#191919]">Full autopilot with guardrails.</h2>
            <p className="mt-4 text-lg leading-8 text-[#555]">
              Live execution is powerful and platform-sensitive. FollowerSpike is designed around consent, review,
              conservative caps, and automatic pauses instead of reckless volume.
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {safetyControls.map((item) => (
              <div key={item.title} className="rounded-xl border border-[#D6D6D6] bg-white p-5 shadow-sm">
                <item.icon className="h-7 w-7 text-[#0A66C2]" />
                <h3 className="mt-4 text-lg font-black text-[#191919]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#555]">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#0A66C2] px-4 py-14 text-white sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-white/80">{BRAND.socialProof} building momentum</p>
              <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-tight">Wake up to a warmer network.</h2>
            </div>
            <SignupButton className="h-12 rounded-full bg-white px-7 text-base font-black text-[#0A66C2] hover:bg-[#EEF3F8]">
              Start 14-Day Trial
            </SignupButton>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10 text-center text-sm leading-6 text-[#666] sm:px-6 lg:px-8">
          {TRUST_DISCLAIMER}
        </section>
      </main>
    </div>
  );
}

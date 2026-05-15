import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SignupButton } from "@/components/marketing/SignupButton";
import { ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";
import { buildSeoPages } from "@/lib/seo";

type PageProps = {
  params: { slug: string };
};

const pages = buildSeoPages();

export function generateStaticParams() {
  return pages.map((page) => ({ slug: page.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const page = pages.find((item) => item.slug === params.slug);
  if (!page) {
    return {
      title: "LinkedIn Growth Tool",
      description: "FollowerSpike helps professionals grow on LinkedIn with posts, engagement, connection requests, follow-ups, and review-first controls.",
    };
  }

  return {
    title: {
      absolute: page.meta_title,
    },
    description: page.meta_description,
  };
}

export default function SeoLandingPage({ params }: PageProps) {
  const page = pages.find((item) => item.slug === params.slug);
  if (!page) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#191919]">
      <MarketingHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
          <p className="text-sm font-black uppercase text-[#0A66C2]">{page.keyword}</p>
          <h1 className="mt-3 text-5xl font-black text-[#191919]">{page.h1}</h1>
          <div className="mt-5 text-lg leading-8 text-[#555]" dangerouslySetInnerHTML={{ __html: page.intro_html }} />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <SignupButton className="h-12 rounded-full bg-[#0A66C2] px-7 text-base font-black text-white hover:bg-[#004182]">
              Start 14-Day Trial
              <ArrowRight className="h-4 w-4" />
            </SignupButton>
            <Link
              href={ROUTES.audit}
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#D6D6D6] px-7 text-base font-black text-[#191919] hover:bg-[#EEF3F8]"
            >
              Get Free Audit
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {page.features_json.map((feature) => (
            <div key={feature} className="flex gap-3 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0A66C2]" />
              <span className="font-semibold text-[#333]">{feature}</span>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-black/10 bg-[#111827] p-6 text-white">
            <ShieldCheck className="h-7 w-7 text-cyan-200" />
            <h2 className="mt-4 text-2xl font-black">Review-first growth autopilot</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              FollowerSpike is built for people who need consistent LinkedIn growth without giving up control of voice,
              target audiences, daily limits, or automation risk.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Post", "Daily posts shaped by profile, niche, and approved voice notes."],
              ["Engage", "Review likes, comments, connection requests, and accepted-connection follow-ups."],
              ["Control", "Consent, caps, pause behavior, logs, and privacy controls."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                <h2 className="font-black text-[#111827]">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#555]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-lg font-bold text-[#191919]">&ldquo;{page.testimonial_json.quote}&rdquo;</p>
          <p className="mt-2 text-sm font-semibold text-[#666]">{page.testimonial_json.author}</p>
        </section>

        <section className="mt-6 space-y-3">
          {page.faq_json.map((faq) => (
            <div key={faq.question} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <h2 className="font-black text-[#191919]">{faq.question}</h2>
              <p className="mt-2 text-sm leading-6 text-[#555]">{faq.answer}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase text-[#0A66C2]">Related guides</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["LinkedIn autopilot", "/features/linkedin-autopilot"],
              ["Free tools", "/free-tools"],
              ["Pricing", ROUTES.pricing],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="rounded-xl border border-black/10 bg-[#f7f4ee] p-4 text-sm font-black text-[#111827] hover:text-[#0A66C2]">
                {label}
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-8 text-center text-sm leading-6 text-[#666]">{TRUST_DISCLAIMER}</p>
      </main>
      <MarketingFooter />
    </div>
  );
}

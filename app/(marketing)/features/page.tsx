import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { featurePages } from "@/lib/marketing/content";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Every part of FollowerSpike: the multi-platform composer, voice engine, Spike Rank, growth automations, lead capture, and the safety controls around them.",
  alternates: { canonical: "/features" },
};

function FeaturesJsonLd() {
  const siteUrl = process.env.APP_URL || "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "FollowerSpike features",
    itemListElement: featurePages.map((page, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: page.eyebrow,
      description: page.description,
      url: `${siteUrl}/features/${page.slug}`,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}

export default function FeaturesIndexPage() {
  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#111827]">
      <FeaturesJsonLd />
      <MarketingHeader />
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <section className="max-w-3xl">
          <p className="text-sm font-black uppercase text-[#0a66c2]">Features</p>
          <h1 className="mt-3 text-5xl font-black sm:text-6xl">
            One founder growth system, across X, LinkedIn, and Bluesky.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[#4b5563]">
            Write in one editor, keep your own voice, know what your profile scores, and let the
            routine parts run on a schedule you control.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={ROUTES.signup}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#111827] px-7 text-base font-black text-white hover:bg-[#0a66c2]"
            >
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-md border border-[#d8d2c4] bg-white px-7 text-base font-black text-[#111827] hover:text-[#0a66c2]"
            >
              See how it works
            </Link>
          </div>
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featurePages.map((page) => (
            <Link
              key={page.slug}
              href={`/features/${page.slug}`}
              className="group flex flex-col rounded-lg border border-[#d8d2c4] bg-white p-6 shadow-sm transition hover:border-[#0a66c2]"
            >
              <page.icon className="h-8 w-8 text-[#0a66c2]" />
              <p className="mt-5 text-sm font-black uppercase text-[#0a66c2]">{page.eyebrow}</p>
              <h2 className="mt-2 text-xl font-black leading-7 text-[#111827]">{page.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-[#4b5563]">{page.description}</p>
              <div className="mt-5 grid gap-2">
                {page.highlights.slice(0, 3).map((highlight) => (
                  <div key={highlight} className="flex items-center gap-2 text-sm font-bold text-[#111827]">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    {highlight}
                  </div>
                ))}
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#0a66c2]">
                Read more
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </section>

        <section className="mt-14 rounded-lg border border-[#d8d2c4] bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black text-[#111827]">Try it before you sign up</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4b5563]">
            The free tools run the same scoring and rewriting engines the product uses. No account
            needed.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/free-tools"
              className="inline-flex h-12 items-center justify-center rounded-md bg-[#111827] px-7 text-base font-black text-white hover:bg-[#0a66c2]"
            >
              Browse free tools
            </Link>
            <Link
              href={ROUTES.pricing}
              className="inline-flex h-12 items-center justify-center rounded-md border border-[#d8d2c4] bg-white px-7 text-base font-black text-[#111827] hover:text-[#0a66c2]"
            >
              See pricing
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

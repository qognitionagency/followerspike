import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { comparisonPages, getComparisonPage } from "@/lib/marketing/content";
import { ROUTES } from "@/lib/constants";

const siteUrl = process.env.APP_URL || "http://localhost:3000";

type PageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return comparisonPages.map((page) => ({ slug: page.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const page = getComparisonPage(params.slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/compare/${page.slug}` },
  };
}

function CompareJsonLd({ slug }: { slug: string }) {
  const page = getComparisonPage(slug);
  if (!page) return null;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Comparisons", item: `${siteUrl}/compare/${page.slug}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />;
}

export default function ComparePage({ params }: PageProps) {
  const page = getComparisonPage(params.slug);
  if (!page) notFound();

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#111827]">
      <CompareJsonLd slug={page.slug} />
      <MarketingHeader />
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-black uppercase text-[#0a66c2]">Compare</p>
          <h1 className="mt-3 text-5xl font-black sm:text-6xl">{page.title}</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#4b5563]">{page.description}</p>
        </section>

        <section className="mt-12 overflow-hidden rounded-lg border border-[#d8d2c4] bg-white shadow-sm">
          <div className="grid grid-cols-[1.1fr_1fr_1fr] bg-[#d8d2c4] text-sm">
            {["Capability", "FollowerSpike", page.competitor].map((heading) => (
              <div key={heading} className="bg-[#111827] p-4 font-black text-white">
                {heading}
              </div>
            ))}
            {page.rows.map((row) => (
              <div key={row.capability} className="contents">
                <div className="bg-white p-4 font-black text-[#111827]">{row.capability}</div>
                <div className="bg-white p-4 text-sm leading-6 text-[#374151]">
                  <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-600" />
                  {row.followerSpike}
                </div>
                <div className="bg-white p-4 text-sm leading-6 text-[#4b5563]">{row.alternative}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {page.faq.map((faq) => (
            <div key={faq.question} className="rounded-lg border border-[#d8d2c4] bg-white p-6 shadow-sm">
              <h2 className="font-black text-[#111827]">{faq.question}</h2>
              <p className="mt-3 text-sm leading-6 text-[#4b5563]">{faq.answer}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-lg border border-[#d8d2c4] bg-[#111827] p-6 text-white shadow-sm">
          <h2 className="text-2xl font-black">Try the software workflow.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Start with the free audit or open pricing to compare Essentials, Growth, and Pro.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href="/free-tools/linkedin-profile-audit" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-[#111827]">
              Run free audit
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={ROUTES.pricing} className="inline-flex h-11 items-center justify-center rounded-md border border-white/20 px-5 text-sm font-black text-white">
              View pricing
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

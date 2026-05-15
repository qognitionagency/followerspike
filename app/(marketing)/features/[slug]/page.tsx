import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { featurePages, getFeaturePage } from "@/lib/marketing/content";
import { ROUTES } from "@/lib/constants";

type PageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return featurePages.map((page) => ({ slug: page.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const page = getFeaturePage(params.slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/features/${page.slug}` },
  };
}

function FeatureJsonLd({ slug }: { slug: string }) {
  const page = getFeaturePage(slug);
  if (!page) return null;
  const siteUrl = process.env.APP_URL || "http://localhost:3000";
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Features", item: `${siteUrl}/features/${page.slug}` },
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

export default function FeaturePage({ params }: PageProps) {
  const page = getFeaturePage(params.slug);
  if (!page) notFound();

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#111827]">
      <FeatureJsonLd slug={page.slug} />
      <MarketingHeader />
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <section className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase text-[#0a66c2]">{page.eyebrow}</p>
            <h1 className="mt-3 text-5xl font-black sm:text-6xl">{page.title}</h1>
            <p className="mt-5 text-lg leading-8 text-[#4b5563]">{page.description}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={ROUTES.signup} className="inline-flex h-12 items-center justify-center rounded-md bg-[#111827] px-7 text-base font-black text-white hover:bg-[#0a66c2]">
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/free-tools" className="inline-flex h-12 items-center justify-center rounded-md border border-[#d8d2c4] bg-white px-7 text-base font-black text-[#111827] hover:text-[#0a66c2]">
                Try free tools
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-[#d8d2c4] bg-white p-6 shadow-sm">
            <page.icon className="h-8 w-8 text-[#0a66c2]" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {page.highlights.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg bg-[#f4f2ee] p-3 text-sm font-black text-[#111827]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-3">
          {page.workflow.map((step, index) => (
            <div key={step.title} className="rounded-lg border border-[#d8d2c4] bg-white p-6 shadow-sm">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-[#111827] text-sm font-black text-white">{index + 1}</span>
              <h2 className="mt-5 text-xl font-black text-[#111827]">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#4b5563]">{step.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-14 rounded-lg border border-[#d8d2c4] bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase text-[#0a66c2]">FAQ</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {page.faq.map((faq) => (
              <div key={faq.question} className="rounded-lg bg-[#fbfaf7] p-5">
                <h2 className="font-black text-[#111827]">{faq.question}</h2>
                <p className="mt-2 text-sm leading-6 text-[#4b5563]">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

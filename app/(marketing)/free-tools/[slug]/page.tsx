import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { FreeToolRunner } from "@/components/marketing/FreeToolRunner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { freeTools, getFreeTool } from "@/lib/marketing/content";

type PageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return freeTools.map((tool) => ({ slug: tool.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const tool = getFreeTool(params.slug);
  if (!tool) return {};
  return {
    title: tool.name,
    description: tool.description,
    alternates: { canonical: `/free-tools/${tool.slug}` },
  };
}

function ToolJsonLd({ slug }: { slug: string }) {
  const tool = getFreeTool(slug);
  if (!tool) return null;
  const siteUrl = process.env.APP_URL || "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${siteUrl}/free-tools/${tool.slug}`,
    description: tool.description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />;
}

export default function FreeToolPage({ params }: PageProps) {
  const tool = getFreeTool(params.slug);
  if (!tool) notFound();

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#111827]">
      <ToolJsonLd slug={tool.slug} />
      <MarketingHeader />
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <section className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase text-[#0a66c2]">{tool.category}</p>
            <h1 className="mt-3 text-5xl font-black sm:text-6xl">{tool.title}</h1>
            <p className="mt-5 text-lg leading-8 text-[#4b5563]">{tool.description}</p>
          </div>
          <div className="rounded-lg border border-[#d8d2c4] bg-white p-5 shadow-sm">
            <p className="font-black text-[#111827]">What you get</p>
            <div className="mt-4 grid gap-3">
              {["Instant lightweight result", "Optional email capture", "Hybrid AI fallback", "Save-to-app CTA"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm font-semibold text-[#4b5563]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <FreeToolRunner
            tool={{
              slug: tool.slug,
              category: tool.category,
              inputLabel: tool.inputLabel,
              inputPlaceholder: tool.inputPlaceholder,
              contextLabel: tool.contextLabel,
              contextPlaceholder: tool.contextPlaceholder,
              resultLabel: tool.resultLabel,
            }}
          />
        </section>

        <section className="mt-12 rounded-lg border border-[#d8d2c4] bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase text-[#0a66c2]">Related tools</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {freeTools
              .filter((item) => item.slug !== tool.slug)
              .slice(0, 3)
              .map((item) => (
                <Link key={item.slug} href={`/free-tools/${item.slug}`} className="rounded-lg border border-[#d8d2c4] bg-[#fbfaf7] p-4 text-sm font-black text-[#111827] hover:text-[#0a66c2]">
                  {item.name}
                  <ArrowRight className="mt-3 h-4 w-4" />
                </Link>
              ))}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

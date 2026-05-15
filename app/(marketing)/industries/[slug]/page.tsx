import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AudiencePageTemplate } from "@/components/marketing/AudiencePageTemplate";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { buildIndustryPages, getIndustryPage } from "@/lib/marketing/content";

type PageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return buildIndustryPages().map((page) => ({ slug: page.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const page = getIndustryPage(params.slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/industries/${page.slug}` },
  };
}

export default function IndustryPage({ params }: PageProps) {
  const page = getIndustryPage(params.slug);
  if (!page) notFound();
  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <MarketingHeader />
      <AudiencePageTemplate page={page} />
      <MarketingFooter />
    </div>
  );
}

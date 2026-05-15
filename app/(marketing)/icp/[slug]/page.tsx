import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AudiencePageTemplate } from "@/components/marketing/AudiencePageTemplate";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { getIcpPage, icpPages } from "@/lib/marketing/content";

type PageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return icpPages.map((page) => ({ slug: page.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const page = getIcpPage(params.slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/icp/${page.slug}` },
  };
}

export default function IcpPage({ params }: PageProps) {
  const page = getIcpPage(params.slug);
  if (!page) notFound();
  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <MarketingHeader />
      <AudiencePageTemplate page={page} />
      <MarketingFooter />
    </div>
  );
}

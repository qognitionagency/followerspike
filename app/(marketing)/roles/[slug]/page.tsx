import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AudiencePageTemplate } from "@/components/marketing/AudiencePageTemplate";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { buildRolePages, getRolePage } from "@/lib/marketing/content";

type PageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return buildRolePages().map((page) => ({ slug: page.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const page = getRolePage(params.slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/roles/${page.slug}` },
  };
}

export default function RolePage({ params }: PageProps) {
  const page = getRolePage(params.slug);
  if (!page) notFound();
  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <MarketingHeader />
      <AudiencePageTemplate page={page} />
      <MarketingFooter />
    </div>
  );
}

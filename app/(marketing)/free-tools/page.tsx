import { appUrl } from "@/lib/env";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { freeTools } from "@/lib/marketing/content";

const siteUrl = appUrl();

export const metadata: Metadata = {
  title: "Free Founder Growth Tools",
  description:
    "Free tools for founders: score your X, Bluesky, or LinkedIn profile, split a draft into a thread, rewrite one post for all three platforms, and test your hooks.",
  alternates: { canonical: "/free-tools" },
};

export default function FreeToolsHubPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Free founder growth tools",
    description: metadata.description,
    itemListElement: freeTools.map((tool, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tool.name,
      url: `${siteUrl}/free-tools/${tool.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#111827]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <MarketingHeader />
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-black uppercase text-[#0a66c2]">Free tools</p>
          <h1 className="mt-3 text-5xl font-black sm:text-6xl">Free tools for X, LinkedIn, and Bluesky.</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#4b5563]">
            Run a lightweight tool instantly. Add email only if you want the result saved or sent into a full FollowerSpike workflow.
          </p>
        </section>
        <section className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {freeTools.map((tool) => (
            <Link key={tool.slug} href={`/free-tools/${tool.slug}`} className="group rounded-lg border border-[#d8d2c4] bg-white p-6 shadow-sm hover:border-[#0A66C2]">
              <tool.icon className="h-6 w-6 text-[#0a66c2]" />
              <p className="mt-5 text-sm font-black uppercase text-[#0a66c2]">{tool.category}</p>
              <h2 className="mt-2 text-2xl font-black text-[#111827]">{tool.name}</h2>
              <p className="mt-3 text-sm leading-6 text-[#4b5563]">{tool.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#0a66c2]">
                Run tool
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

import { appUrl } from "@/lib/env";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { getAllPublicRoutes, publicRouteGroups } from "@/lib/marketing/site-routes";

const siteUrl = appUrl();

export const metadata: Metadata = {
  title: "All Public Pages",
  description:
    "Human-readable index of every public FollowerSpike marketing, feature, tool, blog, role, industry, ICP, comparison, legal, and legacy SEO page.",
  alternates: { canonical: "/site-map" },
};

function JsonLd() {
  const routes = getAllPublicRoutes();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "FollowerSpike public pages",
    numberOfItems: routes.length,
    itemListElement: routes.map((route, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: route.label,
      url: `${siteUrl}${route.href}`,
    })),
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />;
}

export default function SiteMapPage() {
  const total = getAllPublicRoutes().length;

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <JsonLd />
      <MarketingHeader />
      <main>
        <section className="relative overflow-hidden border-b border-slate-100">
          <div className="absolute inset-x-0 top-0 h-px bg-[#D6D6D6]" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <p className="text-sm font-black uppercase tracking-wide text-[#2f80ed]">All pages</p>
            <h1 className="mx-auto mt-3 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight text-slate-950 sm:text-6xl">
              Every public FollowerSpike page in one place.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Browse all {total.toLocaleString()} public URLs from the sitemap, including hubs, tools, blog posts, roles,
              industries, ICP pages, comparisons, legal pages, and legacy SEO pages.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-5 px-4 py-14 sm:px-6 lg:px-8">
          {publicRouteGroups.map((group, index) => (
            <details
              key={group.title}
              open={index < 4}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <summary className="cursor-pointer list-none">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-950">{group.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{group.description}</p>
                  </div>
                  <span className="rounded-full bg-[#eaf3ff] px-3 py-1 text-sm font-black text-[#2f80ed]">
                    {group.routes.length.toLocaleString()} pages
                  </span>
                </div>
              </summary>

              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {group.routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    className="group rounded-lg border border-slate-200 bg-[#fbfdff] p-4 transition hover:border-[#2f80ed]/40 hover:bg-[#f6faff]"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-black text-slate-950">{route.label}</span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#2f80ed]" />
                    </span>
                    {route.description ? <span className="mt-2 line-clamp-2 block text-sm leading-6 text-slate-600">{route.description}</span> : null}
                  </Link>
                ))}
              </div>
            </details>
          ))}
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

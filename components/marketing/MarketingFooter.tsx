import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { BRAND, ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";
import { blogPosts, featurePages, freeTools } from "@/lib/marketing/content";

const footerGroups = [
  {
    title: "Product",
    links: [
      ["How it works", "/#how-it-works"],
      ["Features", "/#features"],
      ["Pricing", ROUTES.pricing],
      ["All pages", "/site-map"],
      ["Multi-Platform Composer", "/features/multi-platform-composer"],
      ["Safety Controls", "/features/safety-controls"],
    ],
  },
  {
    title: "Free Tools",
    links: [["All tools", "/free-tools"], ...freeTools.slice(0, 5).map((tool) => [tool.name, `/free-tools/${tool.slug}`])],
  },
  {
    title: "Solutions",
    links: [
      ["Founders", "/roles/founder"],
      ["SMB owners", "/roles/small-business-owner"],
      ["Coaches", "/roles/executive-coach"],
      ["Consultants", "/roles/consultant"],
      ["Industries", "/industries"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Blog", "/blog"],
      [blogPosts[0].title, `/blog/${blogPosts[0].slug}`],
      [featurePages[0].title, `/features/${featurePages[0].slug}`],
      ["Trust", ROUTES.trust],
      ["Security", ROUTES.security],
      ["XML sitemap", "/sitemap.xml"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Privacy", ROUTES.privacy],
      ["Terms", ROUTES.terms],
      ["DPA", ROUTES.dpa],
      ["Subprocessors", ROUTES.subprocessors],
      ["llms.txt", "/llms.txt"],
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_2.2fr] lg:px-8">
        <div>
          <Link href={ROUTES.home} className="flex items-center gap-2 font-black text-slate-950">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#2f80ed] text-white">
              <TrendingUp className="h-4 w-4" />
            </span>
            {BRAND.name}
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
            LinkedIn growth autopilot for founders, coaches, consultants, SMB owners, creators, and personal brands.
          </p>
          <Link
            href="/free-tools/spike-rank-linkedin"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#2f80ed] px-5 text-sm font-black text-white hover:bg-[#176fd6]"
          >
            Run free audit
          </Link>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">{group.title}</h2>
              <div className="mt-4 grid gap-3">
                {group.links.map(([label, href]) => (
                  <Link key={href} href={href} className="text-sm font-semibold leading-5 text-slate-600 hover:text-[#2f80ed]">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-200 px-4 py-6 text-center text-xs leading-6 text-slate-500 sm:px-6 lg:px-8">
        Copyright 2026 {BRAND.name}. {TRUST_DISCLAIMER}
      </div>
    </footer>
  );
}

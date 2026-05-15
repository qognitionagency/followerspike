import Link from "next/link";
import { BarChart3, Fingerprint, Globe2, Target, TrendingUp } from "lucide-react";
import { BRAND, ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";
import { blogPosts, comparisonPages, featurePages, freeTools } from "@/lib/marketing/content";

const footerGroups = [
  {
    title: "Product",
    links: [
      ["Overview", ROUTES.home],
      ...featurePages.slice(0, 5).map((page) => [page.eyebrow === "Autopilot" ? "LinkedIn Autopilot" : page.eyebrow, `/features/${page.slug}`]),
      ["Pricing", ROUTES.pricing],
    ],
  },
  {
    title: "Free Tools",
    links: [["All free tools", "/free-tools"], ...freeTools.slice(0, 7).map((tool) => [tool.name, `/free-tools/${tool.slug}`])],
  },
  {
    title: "Solutions",
    links: [
      ["Roles hub", "/roles"],
      ["Industries hub", "/industries"],
      ["ICP hub", "/icp"],
      ["For founders", "/roles/founder"],
      ["For SMB owners", "/roles/small-business-owner"],
      ["For consultants", "/roles/consultant"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Blog", "/blog"],
      [blogPosts[0].title, `/blog/${blogPosts[0].slug}`],
      [comparisonPages[0].title, `/compare/${comparisonPages[0].slug}`],
      ["Trust center", ROUTES.trust],
      ["Security", ROUTES.security],
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
    <footer className="border-t border-[#d8d2c4] bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_2.4fr] lg:px-8">
        <div>
          <Link href={ROUTES.home} className="flex items-center gap-2 font-black text-[#111827]">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-[#111827] text-white">
              <TrendingUp className="h-4 w-4" />
            </span>
            {BRAND.name}
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#4b5563]">
            LinkedIn growth autopilot for founders, SMB owners, coaches, consultants, creators, and personal brands.
            Product-led examples, review controls, and pauseable execution.
          </p>
          <div className="mt-5 flex gap-3 text-[#0a66c2]">
            <Globe2 className="h-5 w-5" />
            <Fingerprint className="h-5 w-5" />
            <BarChart3 className="h-5 w-5" />
            <Target className="h-5 w-5" />
          </div>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="font-black text-[#111827]">{group.title}</h2>
              <div className="mt-4 grid gap-3">
                {group.links.map(([label, href]) => (
                  <Link key={href} href={href} className="text-sm font-semibold leading-5 text-[#4b5563] hover:text-[#0a66c2]">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-[#d8d2c4] px-4 py-6 text-center text-xs leading-6 text-[#666] sm:px-6 lg:px-8">
        Copyright 2026 {BRAND.name}. {TRUST_DISCLAIMER}
      </div>
    </footer>
  );
}

import Link from "next/link";
import { BarChart3, Fingerprint, Globe2, Target, TrendingUp } from "lucide-react";
import { BRAND, ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";

const footerGroups = [
  {
    title: "Product",
    links: [
      ["Pricing", ROUTES.pricing],
      ["Free LinkedIn audit", ROUTES.audit],
      ["LinkedIn autopilot", "/linkedin-autopilot"],
      ["LinkedIn ghostwriter", "/linkedin-ghostwriter"],
      ["Trust center", ROUTES.trust],
      ["Security", ROUTES.security],
    ],
  },
  {
    title: "Use cases",
    links: [
      ["For founders", "/tools/linkedin-autopilot-for-founders"],
      ["For CEOs", "/tools/linkedin-ghostwriter-for-ceos"],
      ["For consultants", "/tools/linkedin-automation-for-consultants"],
      ["Vs agency", "/tools/followerspike-vs-hiring-a-linkedin-agency"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Privacy", ROUTES.privacy],
      ["Terms", ROUTES.terms],
      ["DPA", ROUTES.dpa],
      ["Subprocessors", ROUTES.subprocessors],
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-black/10 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_2fr] lg:px-8">
        <div>
          <Link href={ROUTES.home} className="flex items-center gap-2 font-black text-[#111827]">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#111827] text-white">
              <TrendingUp className="h-4 w-4" />
            </span>
            {BRAND.name}
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#4b5563]">
            LinkedIn growth software for people whose reputation matters: posts, comments, connections, review workflows,
            and safety controls.
          </p>
          <div className="mt-5 flex gap-3 text-[#0a66c2]">
            <Globe2 className="h-5 w-5" />
            <Fingerprint className="h-5 w-5" />
            <BarChart3 className="h-5 w-5" />
            <Target className="h-5 w-5" />
          </div>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="font-black text-[#111827]">{group.title}</h2>
              <div className="mt-4 grid gap-3">
                {group.links.map(([label, href]) => (
                  <Link key={href} href={href} className="text-sm font-semibold text-[#4b5563] hover:text-[#0a66c2]">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-black/10 px-4 py-6 text-center text-xs leading-6 text-[#666] sm:px-6 lg:px-8">
        Copyright 2026 {BRAND.name}. {TRUST_DISCLAIMER}
      </div>
    </footer>
  );
}

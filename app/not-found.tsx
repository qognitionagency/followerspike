import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ROUTES } from "@/lib/constants";

/**
 * The site had no 404 page, so a mistyped URL fell through to the unstyled
 * Next.js default: black text on white, no navigation, no way back. This sits
 * at the app root so it catches every unmatched path, marketing and app alike.
 */
export const metadata: Metadata = {
  title: "Page not found",
  description: "That page does not exist. Here is the way back.",
  robots: { index: false, follow: true },
};

const destinations = [
  { href: ROUTES.home, label: "Home", detail: "What FollowerSpike does and who it is for." },
  { href: "/free-tools", label: "Free tools", detail: "Spike Rank, the thread splitter, and the profile audit." },
  { href: ROUTES.pricing, label: "Pricing", detail: "Plans, limits, and what each tier includes." },
  { href: "/blog", label: "Blog", detail: "Writing on distribution for solo founders." },
  { href: "/site-map", label: "Site map", detail: "Every public page in one list." },
];

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F2EE] text-[#191919]">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-20 sm:px-6 lg:px-8">
        <p className="text-sm font-black uppercase tracking-wide text-[#0A66C2]">Error 404</p>
        <h1 className="mt-3 text-5xl font-black leading-tight">This page does not exist.</h1>
        <p className="mt-5 text-lg leading-8 text-[#555]">
          The link may be out of date, or the address may have a typo in it. Nothing is broken on
          your end.
        </p>

        <nav aria-label="Suggested pages" className="mt-10 grid gap-3 sm:grid-cols-2">
          {destinations.map((destination) => (
            <Link
              key={destination.href}
              href={destination.href}
              className="rounded-xl border border-[#D6D6D6] bg-white p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2]"
            >
              <span className="block text-base font-black text-[#191919]">{destination.label}</span>
              <span className="mt-1 block text-sm leading-6 text-[#666]">{destination.detail}</span>
            </Link>
          ))}
        </nav>
      </main>
      <MarketingFooter />
    </div>
  );
}

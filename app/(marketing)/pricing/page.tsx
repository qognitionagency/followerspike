import type { Metadata } from "next";
import Link from "next/link";
import { PricingCards } from "@/components/marketing/PricingCards";
import { BRAND, ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "FollowerSpike pricing for founders, CEOs, consultants, and executives who want LinkedIn consistency without hiring a ghostwriter.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#F4F2EE] text-[#191919]">
      <header className="border-b border-[#D6D6D6] bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href={ROUTES.home} className="font-black text-[#0A66C2]">
            {BRAND.name}
          </Link>
          <Link href={ROUTES.login} className="ml-auto text-sm font-semibold text-[#666] hover:text-[#191919]">
            Login
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-wide text-[#0A66C2]">Simple pricing</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight text-[#191919]">Founder presence for less than a ghostwriter call.</h1>
          <p className="mt-5 text-lg leading-8 text-[#555]">
            Start with Review mode, prove the voice, then turn on risk-managed autopilot when you are comfortable.
          </p>
        </div>

        <PricingCards />

        <p className="mx-auto mt-10 max-w-4xl text-center text-sm leading-6 text-[#666]">{TRUST_DISCLAIMER}</p>
      </main>
    </div>
  );
}

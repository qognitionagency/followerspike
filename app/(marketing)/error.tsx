"use client";

import { Button } from "@/components/ui/button";

export default function MarketingError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F2EE] p-6 text-[#191919]">
      <section className="max-w-md rounded-xl border border-[#D6D6D6] bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-black">This page did not load cleanly.</h1>
        <p className="mt-2 text-sm text-[#666]">Try again and the app will reload this section.</p>
        <Button onClick={reset} className="mt-5 rounded-full bg-[#0A66C2] font-bold text-white hover:bg-[#004182]">
          Retry
        </Button>
      </section>
    </main>
  );
}

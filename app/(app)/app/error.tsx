"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-white p-6 text-[#191919] shadow-sm">
      <h1 className="text-2xl font-black">Something broke in this section.</h1>
      <p className="mt-2 text-sm leading-6 text-[#666]">The app kept your data untouched. Try loading the section again.</p>
      <Button onClick={reset} className="mt-5 rounded-full bg-[#0A66C2] font-bold text-white hover:bg-[#004182]">
        Retry
      </Button>
    </div>
  );
}

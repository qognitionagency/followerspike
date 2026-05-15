"use client";

import { CheckCircle2, Sparkles } from "lucide-react";
import { PRICING } from "@/lib/constants";
import { SignupButton } from "@/components/marketing/SignupButton";
import { cn } from "@/lib/utils";

export function PricingCards() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {PRICING.map((plan) => (
        <div
          key={plan.tier}
          className={cn(
            "relative flex h-full flex-col rounded-xl border bg-white p-6 shadow-sm",
            plan.popular && "border-[#0A66C2] shadow-[0_18px_60px_rgba(10,102,194,0.22)]"
          )}
        >
          {plan.popular ? (
            <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[#0A66C2] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              <Sparkles className="h-3.5 w-3.5" />
              Most Popular
            </div>
          ) : null}

          <div className="space-y-2 pr-24">
            <h3 className="text-2xl font-bold text-[#191919]">{plan.name}</h3>
            <p className="min-h-12 text-sm text-[#666]">{plan.description}</p>
          </div>

          <div className="mt-7 flex items-end gap-2">
            <span className="text-4xl font-black tracking-tight text-[#191919]">{plan.monthlyInr}</span>
            <span className="pb-1 text-sm text-[#666]">/mo or {plan.monthlyUsd}</span>
          </div>

          <ul className="mt-7 flex-1 space-y-3">
            {plan.features.map((feature) => (
              <li key={feature} className="flex gap-3 text-sm text-[#333]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0A66C2]" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <SignupButton
            className={cn(
              "mt-8 h-12 w-full rounded-full font-semibold",
              plan.popular
                ? "bg-[#0A66C2] text-white hover:bg-[#004182]"
                : "bg-[#EEF3F8] text-[#0A66C2] hover:bg-[#DDECF7]"
            )}
          >
            Start 14-Day Trial
          </SignupButton>
        </div>
      ))}
    </div>
  );
}

"use client";

import { CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PRICING, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

function annualMonthlyEquivalent(annualUsd: string) {
  const amount = Number(annualUsd.replace("$", ""));
  return `$${(amount / 12).toFixed(2)}/mo`;
}

export function PricingCards() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const isAnnual = billingCycle === "annual";

  return (
    <div>
      <div className="mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <div className="inline-grid grid-cols-2 rounded-full border border-black/10 bg-white p-1 shadow-sm">
          {[
            ["monthly", "Monthly"],
            ["annual", "Annual"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setBillingCycle(value as "monthly" | "annual")}
              className={cn(
                "h-10 rounded-full px-5 text-sm font-black transition",
                billingCycle === value ? "bg-[#111827] text-white" : "text-[#525252] hover:text-[#111827]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">
          Annual saves 2 months
        </span>
      </div>

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

            <div className="mt-7">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black tracking-tight text-[#191919]">
                  {isAnnual ? plan.annualUsd : plan.monthlyUsd}
                </span>
                <span className="pb-1 text-sm text-[#666]">{isAnnual ? "/year" : "/mo"}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-[#666]">
                {isAnnual ? `${annualMonthlyEquivalent(plan.annualUsd)} billed annually` : "Monthly billing, cancel anytime"}
              </p>
            </div>

            <ul className="mt-7 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm text-[#333]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0A66C2]" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href={`${ROUTES.signup}?source=pricing&plan=${plan.tier}&billing=${billingCycle}`}
              className={cn(
                "mt-8 inline-flex h-12 w-full items-center justify-center rounded-full font-semibold",
                plan.popular
                  ? "bg-[#0A66C2] text-white hover:bg-[#004182]"
                  : "bg-[#EEF3F8] text-[#0A66C2] hover:bg-[#DDECF7]"
              )}
            >
              Start 14-Day Trial
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

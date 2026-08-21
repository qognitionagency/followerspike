/**
 * Reconcile the six Razorpay plans the pricing ladder needs.
 *
 *   pnpm billing:plans            # report only: what exists, what is missing
 *   pnpm billing:plans -- --create  # create whatever is missing, print the env lines
 *
 * Reporting is the default and creating needs the flag, because a plan created
 * in a live Razorpay account cannot be deleted — only deactivated — and one
 * created at the wrong amount is a wrong charge rather than a wrong row.
 *
 * The amounts come from `PRICING` in `lib/constants.ts` rather than from
 * arguments, so the plans cannot drift from what the pricing page shows. Change
 * the price there, run this, and the mismatch is reported.
 *
 * Needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the environment:
 *
 *   set -a && . ./.env.local && set +a && pnpm billing:plans
 */
import { PRICING, type BillingCycle } from "@/lib/constants";

type RazorpayPlan = {
  id: string;
  period: string;
  interval: number;
  item: { name: string; amount: number; currency: string };
  notes?: Record<string, string>;
};

type Wanted = {
  envName: string;
  tier: string;
  cycle: BillingCycle;
  /** Razorpay counts money in the smallest unit — cents for USD. */
  amount: number;
  name: string;
};

const API = "https://api.razorpay.com/v1";

function auth(): string {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) {
    console.error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set.");
    process.exit(1);
  }
  if (id.startsWith("rzp_live_")) {
    console.log("! This is a LIVE Razorpay key. Plans created here are real and cannot be deleted.\n");
  }
  return Buffer.from(`${id}:${secret}`).toString("base64");
}

/** "$19" → 1900. Parsed rather than hardcoded so the pricing page stays the source of truth. */
function cents(display: string): number {
  const value = Number(display.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Cannot read an amount from "${display}"`);
  return Math.round(value * 100);
}

function wantedPlans(): Wanted[] {
  return PRICING.flatMap((plan) => [
    {
      envName: plan.planEnv,
      tier: plan.tier,
      cycle: "monthly" as const,
      amount: cents(plan.monthlyUsd),
      name: `FollowerSpike ${plan.name} (monthly)`,
    },
    {
      envName: plan.annualPlanEnv,
      tier: plan.tier,
      cycle: "annual" as const,
      amount: cents(plan.annualUsd),
      name: `FollowerSpike ${plan.name} (annual)`,
    },
  ]);
}

async function call<T>(path: string, init: RequestInit, token: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Basic ${token}`, "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Razorpay ${init.method ?? "GET"} ${path} failed (${response.status}): ${body}`);
  }
  return JSON.parse(body) as T;
}

async function existingPlans(token: string): Promise<RazorpayPlan[]> {
  const { items } = await call<{ items: RazorpayPlan[] }>("/plans?count=100", { method: "GET" }, token);
  return items;
}

/**
 * An existing plan for the same tier, cycle and amount.
 *
 * Matched on `notes`, which this script writes, rather than on the display name:
 * names are editable in the dashboard and amounts are not, so a plan whose name
 * someone tidied should still be recognised — and one whose amount no longer
 * matches the pricing page must not be.
 */
function matching(plans: RazorpayPlan[], wanted: Wanted): RazorpayPlan | null {
  return (
    plans.find(
      (plan) =>
        plan.notes?.tier === wanted.tier &&
        plan.notes?.billing_cycle === wanted.cycle &&
        plan.item.currency === "USD" &&
        plan.item.amount === wanted.amount
    ) ?? null
  );
}

/** A plan for this slot at the wrong price. Worth naming explicitly — it is the failure that silently overcharges. */
function mismatched(plans: RazorpayPlan[], wanted: Wanted): RazorpayPlan | null {
  return (
    plans.find(
      (plan) =>
        plan.notes?.tier === wanted.tier &&
        plan.notes?.billing_cycle === wanted.cycle &&
        plan.item.amount !== wanted.amount
    ) ?? null
  );
}

async function createPlan(wanted: Wanted, token: string): Promise<RazorpayPlan> {
  return call<RazorpayPlan>(
    "/plans",
    {
      method: "POST",
      body: JSON.stringify({
        period: wanted.cycle === "annual" ? "yearly" : "monthly",
        interval: 1,
        item: { name: wanted.name, amount: wanted.amount, currency: "USD" },
        notes: { product: "FollowerSpike", tier: wanted.tier, billing_cycle: wanted.cycle },
      }),
    },
    token
  );
}

async function main(): Promise<void> {
  const create = process.argv.includes("--create");
  const token = auth();
  const plans = await existingPlans(token);
  const wanted = wantedPlans();

  const envLines: string[] = [];
  let missing = 0;
  let wrongPrice = 0;

  for (const slot of wanted) {
    const found = matching(plans, slot);
    const configured = process.env[slot.envName];

    if (found) {
      const state = configured === found.id ? "configured" : configured ? "ENV MISMATCH" : "not in env";
      console.log(`  ok      ${slot.envName}=${found.id}  ($${slot.amount / 100} ${slot.cycle}) — ${state}`);
      envLines.push(`${slot.envName}=${found.id}`);
      continue;
    }

    const stale = mismatched(plans, slot);
    if (stale) {
      wrongPrice += 1;
      console.log(
        `  PRICE   ${slot.envName}: plan ${stale.id} is $${stale.item.amount / 100}, the pricing page says $${slot.amount / 100}.`
      );
      console.log("          Razorpay plan amounts are immutable — create a new plan and migrate subscribers.");
      continue;
    }

    missing += 1;
    if (!create) {
      console.log(`  MISSING ${slot.envName}  ($${slot.amount / 100} ${slot.cycle}) — run with --create`);
      continue;
    }

    const created = await createPlan(slot, token);
    console.log(`  created ${slot.envName}=${created.id}  ($${slot.amount / 100} ${slot.cycle})`);
    envLines.push(`${slot.envName}=${created.id}`);
  }

  if (envLines.length > 0) {
    console.log("\nSet these in Vercel (production) and in .env.local:\n");
    for (const line of envLines) console.log(`  ${line}`);
  }

  if (missing > 0 && !create) {
    console.log(`\n${missing} plan(s) missing. Re-run with --create once the amounts above look right.`);
  }
  // A wrong price is the one condition worth failing on: it is the difference
  // between an unconfigured checkout and one that charges the wrong amount.
  if (wrongPrice > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

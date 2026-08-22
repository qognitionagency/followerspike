import { createHmac, timingSafeEqual } from "crypto";
import { PRICING, type BillingCycle, type BillingCurrency, type SubscriptionTier } from "@/lib/constants";
import { appUrl, optionalEnv, requiredEnv } from "@/lib/env";

type RazorpaySubscriptionResponse = {
  id: string;
  short_url?: string;
  status: string;
};

export function planIdForTier(tier: SubscriptionTier): string {
  return planIdForCheckout({ tier, billingCycle: "monthly", currency: "USD" });
}

export function planIdForCheckout(params: {
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  currency: BillingCurrency;
}): string {
  const plan = PRICING.find((price) => price.tier === params.tier);
  if (!plan || params.tier === "free") {
    throw new Error("A paid tier is required for Razorpay checkout");
  }

  const envName = params.billingCycle === "annual" ? plan.annualPlanEnv : plan.planEnv;
  const planId = optionalEnv(envName);

  // No fallback to the retired plan ids. The old one mapped Agency to
  // RAZORPAY_PLAN_PRO_MONTHLY_USD, which meant a half-configured deployment
  // charged the wrong price instead of refusing to start a checkout.
  if (!planId) {
    throw new Error(`Missing required environment variable: ${envName}`);
  }

  return planId;
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = requiredEnv("RAZORPAY_WEBHOOK_SECRET");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function createRazorpaySubscription(params: {
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  currency?: BillingCurrency;
  customerEmail: string;
  customerName?: string | null;
  userId: string;
}): Promise<RazorpaySubscriptionResponse> {
  const keyId = requiredEnv("RAZORPAY_KEY_ID");
  const keySecret = requiredEnv("RAZORPAY_KEY_SECRET");
  const currency = params.currency ?? "USD";
  const planId = planIdForCheckout({ tier: params.tier, billingCycle: params.billingCycle, currency });
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const totalCount = params.billingCycle === "annual" ? 10 : 120;

  const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      total_count: totalCount,
      quantity: 1,
      customer_notify: true,
      notes: {
        user_id: params.userId,
        tier: params.tier,
        billing_cycle: params.billingCycle,
        currency,
        customer_email: params.customerEmail,
        customer_name: params.customerName ?? "",
        product: "FollowerSpike",
      },
      addons: [],
      expire_by: Math.floor(Date.now() / 1000) + 30 * 60,
      callback_url: `${appUrl()}/app/settings?checkout=success&tier=${params.tier}&billing=${params.billingCycle}`,
      callback_method: "get",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Razorpay subscription creation failed with ${response.status}${errorText ? `: ${errorText}` : ""}`);
  }

  return (await response.json()) as RazorpaySubscriptionResponse;
}

/**
 * Cancels a subscription at Razorpay.
 *
 * Defaults to the end of the paid period, which is the honest default: the
 * member has already paid for the current cycle, so ending access the instant
 * they click cancel would be taking money for time they do not get. They keep
 * everything until `current_period_end` and are not charged again.
 *
 * The local `subscriptions` row is not updated here. Razorpay answers this call
 * and then sends a `subscription.cancelled` webhook, and that webhook is the
 * single writer for subscription state — having two writers is how a cancelled
 * subscription ends up still marked active, or the reverse.
 */
export async function cancelRazorpaySubscription(params: {
  subscriptionId: string;
  atCycleEnd?: boolean;
}): Promise<{ id: string; status: string; ended_at?: number | null }> {
  const keyId = requiredEnv("RAZORPAY_KEY_ID");
  const keySecret = requiredEnv("RAZORPAY_KEY_SECRET");
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch(
    `https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(params.subscriptionId)}/cancel`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${auth}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ cancel_at_cycle_end: params.atCycleEnd === false ? 0 : 1 }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Razorpay subscription cancellation failed with ${response.status}${errorText ? `: ${errorText}` : ""}`
    );
  }

  return (await response.json()) as { id: string; status: string; ended_at?: number | null };
}

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
  const plan = PRICING.find((price) => price.tier === tier);
  if (!plan || tier === "free") {
    throw new Error("A paid tier is required for Razorpay checkout");
  }

  const envName = params.billingCycle === "annual" ? plan.annualPlanEnv : plan.planEnv;
  const fallbackEnvName = params.billingCycle === "monthly" ? plan.legacyPlanEnv : "";
  const planId = optionalEnv(envName) || (fallbackEnvName ? optionalEnv(fallbackEnvName) : "");

  if (!planId) {
    throw new Error(
      `Missing required environment variable: ${envName}${fallbackEnvName ? ` or ${fallbackEnvName}` : ""}`
    );
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

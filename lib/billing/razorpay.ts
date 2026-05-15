import { createHmac, timingSafeEqual } from "crypto";
import { PRICING, type SubscriptionTier } from "@/lib/constants";
import { appUrl, requiredEnv } from "@/lib/env";

type RazorpaySubscriptionResponse = {
  id: string;
  short_url?: string;
  status: string;
};

export function planIdForTier(tier: SubscriptionTier): string {
  const plan = PRICING.find((price) => price.tier === tier);
  if (!plan || tier === "free") {
    throw new Error("A paid tier is required for Razorpay checkout");
  }
  return requiredEnv(plan.planEnv);
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
  customerEmail: string;
  customerName?: string | null;
  userId: string;
}): Promise<RazorpaySubscriptionResponse> {
  const keyId = requiredEnv("RAZORPAY_KEY_ID");
  const keySecret = requiredEnv("RAZORPAY_KEY_SECRET");
  const planId = planIdForTier(params.tier);
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      total_count: 120,
      quantity: 1,
      customer_notify: 1,
      notes: {
        user_id: params.userId,
        tier: params.tier,
        product: "FollowerSpike",
      },
      notify_info: {
        notify_email: params.customerEmail,
      },
      addons: [],
      expire_by: Math.floor(Date.now() / 1000) + 30 * 60,
      callback_url: `${appUrl()}/app/settings?checkout=success`,
      callback_method: "get",
    }),
  });

  if (!response.ok) {
    throw new Error(`Razorpay subscription creation failed with ${response.status}`);
  }

  return (await response.json()) as RazorpaySubscriptionResponse;
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyRazorpayWebhookSignature } from "@/lib/billing/razorpay";
import type { SubscriptionTier } from "@/lib/constants";

const webhookSchema = z.object({
  event: z.string(),
  payload: z.object({
    subscription: z
      .object({
        entity: z
          .object({
            id: z.string(),
            status: z.string(),
            plan_id: z.string().optional(),
            current_start: z.number().optional(),
            current_end: z.number().optional(),
            notes: z
              .object({
                user_id: z.string().uuid().optional(),
                tier: z.enum(["starter", "pro", "scale"]).optional(),
              })
              .optional(),
          })
          .passthrough(),
      })
      .optional(),
  }),
});

function toStatus(status: string) {
  if (status === "active") return "active";
  if (status === "authenticated") return "trialing";
  if (status === "pending") return "trialing";
  if (status === "halted") return "past_due";
  if (status === "cancelled" || status === "completed") return "canceled";
  return "paused";
}

function toTimestamp(seconds?: number): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsedJson = webhookSchema.safeParse(json);
  if (!parsedJson.success) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const subscription = parsedJson.data.payload.subscription?.entity;
  if (!subscription?.notes?.user_id || !subscription.notes.tier) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const tier = subscription.notes.tier as SubscriptionTier;
  const supabase = createAdminClient();
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: subscription.notes.user_id,
      razorpay_subscription_id: subscription.id,
      razorpay_plan_id: subscription.plan_id,
      tier,
      status: toStatus(subscription.status),
      current_period_start: toTimestamp(subscription.current_start),
      current_period_end: toTimestamp(subscription.current_end),
    },
    { onConflict: "razorpay_subscription_id" }
  );

  if (error) {
    return NextResponse.json({ error: "Subscription sync failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

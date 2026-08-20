import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyRazorpayWebhookSignature } from "@/lib/billing/razorpay";
import { normalizeSubscriptionTier } from "@/lib/constants";

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
                // Legacy values stay accepted so subscriptions created under the old
                // pricing ladder keep resolving; normalizeSubscriptionTier maps them.
                tier: z.enum(["starter", "pro", "agency", "essentials", "growth", "scale"]).optional(),
                billing_cycle: z.enum(["monthly", "annual"]).optional(),
                currency: z.string().optional(),
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

  const tier = normalizeSubscriptionTier(subscription.notes.tier);
  try {
    const sql = db();
    // Razorpay retries webhooks, so the upsert on razorpay_subscription_id is
    // what keeps a redelivery from creating a second subscription row.
    await sql`
      insert into subscriptions (
        user_id, razorpay_subscription_id, razorpay_plan_id, tier, billing_cycle,
        currency, status, current_period_start, current_period_end
      )
      values (
        ${subscription.notes.user_id ?? null},
        ${subscription.id},
        ${subscription.plan_id ?? null},
        ${tier},
        ${subscription.notes.billing_cycle ?? "monthly"},
        ${subscription.notes.currency ?? "USD"},
        ${toStatus(subscription.status)},
        ${toTimestamp(subscription.current_start)},
        ${toTimestamp(subscription.current_end)}
      )
      on conflict (razorpay_subscription_id) do update set
        razorpay_plan_id = excluded.razorpay_plan_id,
        tier = excluded.tier,
        billing_cycle = excluded.billing_cycle,
        currency = excluded.currency,
        status = excluded.status,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        updated_at = now()
    `;
  } catch {
    return NextResponse.json({ error: "Subscription sync failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

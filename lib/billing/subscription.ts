/**
 * Reading a member's current subscription.
 *
 * `subscriptions` is written only by the Razorpay webhook. This is the read
 * side, so the settings page can show what someone is actually paying for and
 * offer to cancel it.
 */
import { db, databaseConfigured } from "@/lib/db";

export type CurrentSubscription = {
  id: string;
  razorpay_subscription_id: string | null;
  tier: string;
  billing_cycle: string;
  currency: string;
  status: string;
  current_period_end: string | null;
};

/** Statuses that still entitle someone to the plan they are on. */
const LIVE_STATUSES = ["active", "trialing", "past_due"];

/**
 * The subscription to act on, or null.
 *
 * Newest first, because a member who cancelled and resubscribed has more than
 * one row and the current one is the last written.
 */
export async function currentSubscription(userId: string): Promise<CurrentSubscription | null> {
  if (!databaseConfigured()) return null;

  const sql = db();
  const rows = await sql`
    select id, razorpay_subscription_id, tier, billing_cycle, currency, status, current_period_end
    from subscriptions
    where user_id = ${userId}
    order by created_at desc
    limit 1
  `;

  return (rows[0] as CurrentSubscription | undefined) ?? null;
}

/** Whether there is something worth showing a cancel button for. */
export function isCancellable(subscription: CurrentSubscription | null): subscription is CurrentSubscription {
  return Boolean(
    subscription && subscription.razorpay_subscription_id && LIVE_STATUSES.includes(subscription.status)
  );
}

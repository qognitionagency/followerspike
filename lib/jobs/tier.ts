import { db, databaseConfigured } from "@/lib/db";
import { normalizeSubscriptionTier, type SubscriptionTier } from "@/lib/constants";

/**
 * The tier a background job should bill an action against.
 *
 * A job has no session to read a tier from, so it asks the database. `past_due`
 * counts as a live subscription on purpose: a failed card should not silently
 * downgrade someone's automation mid-cycle, and dunning is Razorpay's job.
 */
export async function tierForUser(userId: string): Promise<SubscriptionTier> {
  if (!databaseConfigured()) return "free";

  const sql = db();
  const rows = await sql`
    select tier from subscriptions
    where user_id = ${userId} and status in ('active', 'trialing', 'past_due')
    order by created_at desc
    limit 1
  `;
  return normalizeSubscriptionTier(rows[0]?.tier);
}

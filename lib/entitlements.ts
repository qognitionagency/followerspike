import { db, databaseConfigured } from "@/lib/db";
import { FREE_TIER_LIMITS, PRICING, type SubscriptionTier } from "@/lib/constants";

/**
 * What a tier is actually allowed to do.
 *
 * The numbers already existed — `PRICING[].limits` and `FREE_TIER_LIMITS` in
 * `lib/constants.ts` — but nothing consulted them, so every limit on the pricing
 * page was decorative. This is the single place that turns them into an answer,
 * so changing a plan stays a one-file edit in `constants.ts`.
 *
 * Connected-account counts were the exception: they lived only inside marketing
 * `features` strings ("3 connected accounts", "6", "15"), which no code can
 * read. They are structured here.
 */

const CONNECTED_ACCOUNTS: Record<SubscriptionTier, number> = {
  free: FREE_TIER_LIMITS.connectedAccounts,
  starter: 3,
  pro: 6,
  agency: 15,
};

/** Free is absent from PRICING — it is "handled by absence of a subscription row". */
const FREE_DAILY_LIMITS = { posts: 1, comments: 0, invites: 0, likes: 0 } as const;

export type DailyLimits = {
  posts: number;
  comments: number;
  invites: number;
  likes: number;
};

export function dailyLimitsForTier(tier: SubscriptionTier): DailyLimits {
  const plan = PRICING.find((entry) => entry.tier === tier);
  return plan ? { ...plan.limits } : { ...FREE_DAILY_LIMITS };
}

export function connectedAccountLimit(tier: SubscriptionTier): number {
  return CONNECTED_ACCOUNTS[tier];
}

/** Free is capped on total scheduled posts ever; paid tiers are capped per day instead. */
export function scheduledPostCap(tier: SubscriptionTier): number | null {
  return tier === "free" ? FREE_TIER_LIMITS.scheduledPostsTotal : null;
}

export function aiCallsPerMonth(tier: SubscriptionTier): number | null {
  return tier === "free" ? FREE_TIER_LIMITS.aiRewritesPerMonth : null;
}

export type EntitlementDecision =
  | { allowed: true }
  | { allowed: false; reason: string; limit: number };

/**
 * Whether another social account may be connected.
 *
 * Counts only active accounts: disconnecting one has to free its seat, or a
 * user who reconnects the same handle is permanently down a slot.
 */
export async function canConnectAccount(
  workspaceId: string,
  tier: SubscriptionTier
): Promise<EntitlementDecision> {
  const limit = connectedAccountLimit(tier);
  if (!databaseConfigured()) return { allowed: true };

  const sql = db();
  const rows = await sql`
    select count(*)::int as total
    from social_accounts
    where workspace_id = ${workspaceId} and is_active
  `;
  const total = (rows[0]?.total as number) ?? 0;

  return total < limit
    ? { allowed: true }
    : {
        allowed: false,
        limit,
        reason:
          tier === "free"
            ? "The free plan connects one account. Upgrade to add the other platforms."
            : `This plan connects ${limit} accounts.`,
      };
}

/**
 * Whether another post may be scheduled.
 *
 * Free is a lifetime cap on scheduled posts; paid tiers are governed by the
 * per-day caps the safety gate enforces at publish time, so there is nothing to
 * check here for them.
 */
export async function canSchedulePost(
  workspaceId: string,
  tier: SubscriptionTier
): Promise<EntitlementDecision> {
  const cap = scheduledPostCap(tier);
  if (cap === null || !databaseConfigured()) return { allowed: true };

  const sql = db();
  const rows = await sql`
    select count(*)::int as total
    from posts
    where workspace_id = ${workspaceId} and status in ('scheduled', 'published')
  `;
  const total = (rows[0]?.total as number) ?? 0;

  return total < cap
    ? { allowed: true }
    : {
        allowed: false,
        limit: cap,
        reason: `The free plan covers ${cap} scheduled posts. Upgrade to keep publishing.`,
      };
}

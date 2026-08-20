import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { normalizeSubscriptionTier } from "@/lib/constants";
import { databaseConfigured, db } from "@/lib/db";
import type { AppSession, Subscription, UserProfile } from "@/lib/types";

const FREE_SUBSCRIPTION: Omit<Subscription, "user_id"> = {
  id: "free",
  tier: "free",
  status: "trialing",
  current_period_end: null,
  trial_ends_at: null,
};

/**
 * Resolves the Clerk session to our own users row, creating it on first sight.
 *
 * Clerk owns identity, but every table keys off the local uuid, so the Clerk id
 * is only ever a lookup key. Provisioning happens here rather than in a database
 * trigger because there is no auth schema on Neon to hang a trigger from.
 */
async function resolveUserProfile(clerkUserId: string): Promise<UserProfile | null> {
  const sql = db();

  const existing = await sql`select * from users where clerk_user_id = ${clerkUserId} limit 1`;
  if (existing.length) {
    return existing[0] as UserProfile;
  }

  const clerkUser = await currentUser();
  const primary =
    clerkUser?.emailAddresses?.find((address) => address.id === clerkUser?.primaryEmailAddressId) ??
    clerkUser?.emailAddresses?.[0];
  const email = primary?.emailAddress ?? null;
  const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null;

  // Claiming an existing row treats the email as proof of identity, and a seeded
  // row can carry is_admin — so an unverified address must never claim one, or
  // signing up as the seeded admin's address would hand over the account. Only a
  // Clerk-verified email is trusted here; anything else provisions a fresh row.
  const emailVerified = primary?.verification?.status === "verified";

  if (email && emailVerified) {
    // A row may already exist without a Clerk id — an admin seeded by email, or a
    // record that predates Clerk. Claim it instead of creating a duplicate, which
    // would silently strip that person of their data and their admin flag.
    const claimed = await sql`
      update users
      set clerk_user_id = ${clerkUserId},
          full_name = coalesce(full_name, ${fullName}),
          updated_at = now()
      where lower(email) = lower(${email}) and clerk_user_id is null
      returning *
    `;
    if (claimed.length) {
      return claimed[0] as UserProfile;
    }
  }

  // on conflict covers the race where two requests provision the same user at once.

  const created = await sql`
    insert into users (clerk_user_id, email, full_name)
    values (${clerkUserId}, ${email}, ${fullName})
    on conflict (clerk_user_id) do update set email = excluded.email
    returning *
  `;

  return (created[0] as UserProfile) ?? null;
}

export async function getAppSession(): Promise<AppSession | null> {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId || !databaseConfigured()) {
    return null;
  }

  const profile = await resolveUserProfile(clerkUserId);
  if (!profile) {
    return null;
  }

  const sql = db();
  const rows = await sql`
    select * from subscriptions
    where user_id = ${profile.id}
      and status in ('active', 'trialing', 'past_due')
    order by created_at desc
    limit 1
  `;

  const subscription = (rows[0] as Subscription | undefined) ?? {
    ...FREE_SUBSCRIPTION,
    user_id: profile.id,
  };
  subscription.tier = normalizeSubscriptionTier(subscription.tier);

  return {
    userId: profile.id,
    email: profile.email ?? "",
    profile,
    subscription,
    subscriptionTier: subscription.tier,
  };
}

export async function requireAppSession(): Promise<AppSession> {
  const session = await getAppSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export function canUseTier(current: AppSession["subscriptionTier"], required: AppSession["subscriptionTier"]): boolean {
  const rank: Record<AppSession["subscriptionTier"], number> = {
    free: 0,
    starter: 1,
    pro: 2,
    agency: 3,
  };
  return rank[current] >= rank[required];
}

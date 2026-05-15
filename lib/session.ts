import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppSession, Subscription, UserProfile } from "@/lib/types";

const FREE_SUBSCRIPTION: Omit<Subscription, "user_id"> = {
  id: "free",
  tier: "free",
  status: "trialing",
  current_period_end: null,
  trial_ends_at: null,
};

export async function getAppSession(): Promise<AppSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const { data: profileData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profileData) {
    return null;
  }

  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const profile = profileData as UserProfile;
  const subscription = (subscriptionData as Subscription | null) ?? {
    ...FREE_SUBSCRIPTION,
    user_id: user.id,
  };

  return {
    userId: user.id,
    email: user.email,
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
    scale: 3,
  };
  return rank[current] >= rank[required];
}

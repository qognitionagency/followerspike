import { NextResponse } from "next/server";
import { requireAppSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
  const session = await requireAppSession();
  const sql = db();
  const userId = session.userId;

  // GDPR export: everything this user owns, across the v2 schema. The retired
  // LinkedIn automation tables (comments, connections, target_leaders) are gone,
  // and the v2 tables that replaced them are exported in their place.
  const [
    user,
    subscriptions,
    posts,
    postVariants,
    socialAccounts,
    profileScores,
    voiceProfiles,
    growthPlans,
    automations,
    automationLog,
    profileAudits,
    leads,
  ] = await Promise.all([
    sql`select * from users where id = ${userId} limit 1`,
    sql`select * from subscriptions where user_id = ${userId}`,
    sql`select * from posts where user_id = ${userId}`,
    sql`select v.* from post_variants v join posts p on p.id = v.post_id where p.user_id = ${userId}`,
    sql`select * from social_accounts where user_id = ${userId}`,
    sql`select * from profile_scores where user_id = ${userId}`,
    sql`select * from voice_profiles where user_id = ${userId}`,
    sql`select * from growth_plans where user_id = ${userId}`,
    sql`select * from automations where user_id = ${userId}`,
    sql`select * from automation_log where user_id = ${userId}`,
    sql`select * from profile_audits where user_id = ${userId}`,
    sql`select * from leads where user_id = ${userId}`,
  ]);

  return NextResponse.json(
    {
      exportedAt: new Date().toISOString(),
      product: "FollowerSpike",
      user: user[0] ?? null,
      subscriptions,
      posts,
      postVariants,
      socialAccounts,
      profileScores,
      voiceProfiles,
      growthPlans,
      automations,
      automationLog,
      profileAudits,
      leads,
    },
    {
      headers: {
        "content-disposition": `attachment; filename="followerspike-export-${userId}.json"`,
      },
    }
  );
}

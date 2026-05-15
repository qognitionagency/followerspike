import { NextResponse } from "next/server";
import { requireAppSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

type UserExportRow = Record<string, unknown> & {
  linkedin_session_encrypted?: string | null;
};

function stripSensitiveUserFields(user: UserExportRow | null): Record<string, unknown> | null {
  if (!user) return null;
  const { linkedin_session_encrypted: _linkedinSessionEncrypted, ...safeUser } = user;
  return {
    ...safeUser,
    linkedin_session_connected: Boolean(_linkedinSessionEncrypted),
  };
}

export async function GET() {
  const session = await requireAppSession();
  const supabase = await createClient();

  const [
    { data: user },
    { data: subscriptions },
    { data: posts },
    { data: comments },
    { data: connections },
    { data: targetLeaders },
    { data: automationLog },
    { data: profileAudits },
  ] = await Promise.all([
    supabase.from("users").select("*").eq("id", session.userId).maybeSingle(),
    supabase.from("subscriptions").select("*").eq("user_id", session.userId),
    supabase.from("posts").select("*").eq("user_id", session.userId),
    supabase.from("comments").select("*").eq("user_id", session.userId),
    supabase.from("connections").select("*").eq("user_id", session.userId),
    supabase.from("target_leaders").select("*").eq("user_id", session.userId),
    supabase.from("automation_log").select("*").eq("user_id", session.userId),
    supabase.from("profile_audits").select("*").eq("user_id", session.userId),
  ]);

  return NextResponse.json(
    {
      exportedAt: new Date().toISOString(),
      product: "FollowerSpike",
      user: stripSensitiveUserFields(user as UserExportRow | null),
      subscriptions: subscriptions ?? [],
      posts: posts ?? [],
      comments: comments ?? [],
      connections: connections ?? [],
      targetLeaders: targetLeaders ?? [],
      automationLog: automationLog ?? [],
      profileAudits: profileAudits ?? [],
    },
    {
      headers: {
        "content-disposition": `attachment; filename="followerspike-export-${session.userId}.json"`,
      },
    }
  );
}

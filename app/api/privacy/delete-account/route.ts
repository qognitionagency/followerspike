import { NextResponse } from "next/server";
import { requireAppSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const session = await requireAppSession();
  const supabase = createAdminClient();

  await supabase.from("automation_log").insert({
    user_id: session.userId,
    action: "profile_scrape",
    outcome: "success",
    reason: "account_deletion_requested",
  });

  const { error } = await supabase.auth.admin.deleteUser(session.userId);

  if (error) {
    return NextResponse.json({ error: "Account deletion failed" }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}

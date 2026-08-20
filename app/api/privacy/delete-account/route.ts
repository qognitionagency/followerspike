import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { requireAppSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function POST() {
  const session = await requireAppSession();
  const { userId: clerkUserId } = await auth();
  const sql = db();

  await sql`
    insert into automation_log (user_id, action, outcome, reason)
    values (${session.userId}, ${"profile_scrape"}, ${"success"}, ${"account_deletion_requested"})
  `;

  try {
    if (clerkUserId) {
      const clerk = await clerkClient();
      await clerk.users.deleteUser(clerkUserId);
    }
    // Every user-owned table cascades from users.id, so this clears the rest.
    await sql`delete from users where id = ${session.userId}`;
  } catch {
    return NextResponse.json({ error: "Account deletion failed" }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}

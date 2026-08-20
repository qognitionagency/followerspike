import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { databaseConfigured, db } from "@/lib/db";

/**
 * Keeps the Neon `users` row in step with Clerk.
 *
 * lib/session.ts provisions a row on first sign-in, but it never sees a later
 * email change or a deletion made from the Clerk dashboard. This closes that
 * gap. The route is public in middleware because Clerk signs it — verifyWebhook
 * checks the Svix signature and throws on anything unsigned or replayed.
 */
export async function POST(request: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!databaseConfigured()) {
    // Acknowledge, or Clerk retries a delivery we can never accept.
    return NextResponse.json({ received: true, stored: false });
  }

  const sql = db();

  if (event.type === "user.created" || event.type === "user.updated") {
    const data = event.data;
    const email =
      data.email_addresses?.find((address) => address.id === data.primary_email_address_id)?.email_address ??
      data.email_addresses?.[0]?.email_address ??
      null;
    const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

    await sql`
      insert into users (clerk_user_id, email, full_name)
      values (${data.id}, ${email}, ${fullName})
      on conflict (clerk_user_id) do update set
        email = excluded.email,
        full_name = coalesce(excluded.full_name, users.full_name),
        updated_at = now()
    `;
  }

  if (event.type === "user.deleted" && event.data.id) {
    // Every user-owned table cascades from users.id.
    await sql`delete from users where clerk_user_id = ${event.data.id}`;
  }

  return NextResponse.json({ received: true });
}

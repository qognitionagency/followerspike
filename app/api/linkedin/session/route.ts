import { NextResponse } from "next/server";
import { z } from "zod";
import { encryptLinkedInSession } from "@/lib/security/encryption";
import { requireAppSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const CookieSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  domain: z.string().min(1),
  path: z.string().optional(),
  expires: z.number().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  sameSite: z.enum(["Strict", "Lax", "None"]).optional(),
});

const SessionBodySchema = z.object({
  cookies: z.array(CookieSchema).min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requireAppSession();
    const body = SessionBodySchema.parse((await request.json()) as unknown);
    const encrypted = encryptLinkedInSession(JSON.stringify(body.cookies));
    const supabase = await createClient();
    await supabase
      .from("users")
      .update({
        linkedin_session_encrypted: encrypted,
        autopilot_paused: true,
        autopilot_pause_reason: "session_connected_review_required",
      })
      .eq("id", session.userId);
    return NextResponse.json({ connected: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not store LinkedIn session" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await requireAppSession();
  const supabase = await createClient();
  await supabase
    .from("users")
    .update({
      linkedin_session_encrypted: null,
      autopilot_enabled: false,
      autopilot_paused: true,
      autopilot_pause_reason: "session_deleted",
    })
    .eq("id", session.userId);
  return NextResponse.json({ deleted: true });
}

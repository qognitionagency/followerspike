import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePost } from "@/lib/ai/generators";
import { requireAppSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const PostBodySchema = z.object({
  topicSeed: z.string().min(3).max(300),
});

export async function POST(request: Request) {
  try {
    const session = await requireAppSession();
    const body = PostBodySchema.parse((await request.json()) as unknown);
    const generated = await generatePost(
      {
        email: session.email,
        profile: session.profile,
        subscriptionTier: session.subscriptionTier,
      },
      body.topicSeed
    );

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: session.userId,
        content: generated.content,
        topic_seed: body.topicSeed,
        status: "pending_approval",
        source_prompt: generated.rationale,
      })
      .select("id, content, status")
      .single();

    if (error) {
      return NextResponse.json({ error: "Could not save generated post" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Post generation failed" }, { status: 500 });
  }
}

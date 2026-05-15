import { NextResponse } from "next/server";
import { z } from "zod";
import { generateComment, scoreRelevance } from "@/lib/ai/generators";
import { requireAppSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const CommentBodySchema = z.object({
  targetPostUrl: z.string().url(),
  targetPost: z.string().min(10).max(3000),
  targetAuthorName: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireAppSession();
    const body = CommentBodySchema.parse((await request.json()) as unknown);
    const relevance = await scoreRelevance({ profile: session.profile }, body.targetPost);

    if (relevance.score < 7) {
      return NextResponse.json({ skipped: true, relevance });
    }

    const generated = await generateComment({ profile: session.profile }, body.targetPost);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("comments")
      .insert({
        user_id: session.userId,
        target_post_url: body.targetPostUrl,
        target_author_name: body.targetAuthorName,
        target_post_snippet: body.targetPost.slice(0, 500),
        generated_comment: generated.comment,
        relevance_score: relevance.score,
        status: "pending_approval",
      })
      .select("id, generated_comment, relevance_score, status")
      .single();

    if (error) {
      return NextResponse.json({ error: "Could not save generated comment" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Comment generation failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePost } from "@/lib/ai/generators";
import { requireAppSession } from "@/lib/session";
import { db } from "@/lib/db";

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

    const sql = db();
    const rows = await sql`
      insert into posts (user_id, content, topic_seed, status, source_prompt)
      values (
        ${session.userId},
        ${generated.content},
        ${body.topicSeed},
        ${"pending_approval"},
        ${generated.rationale}
      )
      returning id, content, status
    `;

    if (!rows.length) {
      return NextResponse.json({ error: "Could not save generated post" }, { status: 500 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Post generation failed" }, { status: 500 });
  }
}

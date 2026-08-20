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
    // v2 splits a post into a container plus one row of content per platform.
    // A generated draft starts as 'draft'; the queue promotes it to 'scheduled'.
    const posts = await sql`
      insert into posts (user_id, status, created_via)
      values (${session.userId}, ${"draft"}, ${"ai"})
      returning id, status
    `;

    const post = posts[0] as { id: string; status: string } | undefined;
    if (!post) {
      return NextResponse.json({ error: "Could not save generated post" }, { status: 500 });
    }

    await sql`
      insert into post_variants (post_id, platform, content)
      values (${post.id}, ${"linkedin"}, ${generated.content})
    `;

    return NextResponse.json({ id: post.id, status: post.status, content: generated.content });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Post generation failed" }, { status: 500 });
  }
}

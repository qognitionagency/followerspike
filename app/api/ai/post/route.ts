import { NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect";
import { z } from "zod";
import { generatePostResult, promptUserContext } from "@/lib/ai/generators";
import { attachAiGenerationToPost } from "@/lib/ai/usage";
import { requireAppSession } from "@/lib/session";
import { requireWorkspace } from "@/lib/workspace";
import { db } from "@/lib/db";

const PostBodySchema = z.object({
  topicSeed: z.string().min(3).max(300),
  // v2 is a three-platform product; linkedin is the default only because this
  // route predates X and Bluesky and existing clients send no platform.
  platform: z.enum(["linkedin", "x", "bluesky"]).default("linkedin"),
});

export async function POST(request: Request) {
  try {
    const session = await requireAppSession();
    const { workspace } = await requireWorkspace(session);
    const body = PostBodySchema.parse((await request.json()) as unknown);

    const generated = await generatePostResult(promptUserContext(session.profile), body.topicSeed, {
      workspaceId: workspace.id,
      userId: session.userId,
    });

    // No fallback here on purpose. This draft goes into the queue and is
    // published under the user's own name, so canned prose must surface as a
    // failure rather than as a 200 the user cannot tell apart from a generation.
    if (!generated.ok) {
      const status = generated.reason === "no_provider_configured" ? 503 : 502;
      return NextResponse.json({ error: "AI generation is unavailable" }, { status });
    }

    const sql = db();
    // v2 splits a post into a container plus one row of content per platform.
    // Both inserts live in one statement: a failing variant insert used to leave
    // an empty orphan post behind, and the Neon HTTP driver's batched
    // `sql.transaction([...])` cannot feed the returned post id into the second
    // query, so a data-modifying CTE is what makes the pair atomic.
    // A generated draft starts as 'draft'; the queue promotes it to 'scheduled'.
    const rows = await sql`
      with new_post as (
        insert into posts (workspace_id, user_id, status, created_via)
        values (${workspace.id}, ${session.userId}, ${"draft"}, ${"ai"})
        returning id, status
      ), new_variant as (
        insert into post_variants (post_id, platform, content)
        select id, ${body.platform}, ${generated.value.content} from new_post
        returning post_id
      )
      select id, status from new_post
    `;

    const post = rows[0] as { id: string; status: string } | undefined;
    if (!post) {
      return NextResponse.json({ error: "Could not save generated post" }, { status: 500 });
    }

    if (generated.generationId) {
      await attachAiGenerationToPost(generated.generationId, post.id);
    }

    return NextResponse.json({
      id: post.id,
      status: post.status,
      platform: body.platform,
      content: generated.value.content,
      rationale: generated.value.rationale,
    });
  } catch (error) {
    // requireAppSession redirects by throwing. Swallowing that turned an
    // unreachable database into a generic 500; re-throwing it here would answer
    // an API client with a 307 to an HTML login page, which is no better.
    // Middleware already 401s anonymous /api callers, so reaching this line
    // means the session could not be resolved server-side — a dependency
    // failure, which is what this reports.
    if (isRedirectError(error)) {
      return NextResponse.json({ error: "Session is unavailable" }, { status: 503 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Post generation failed" }, { status: 500 });
  }
}

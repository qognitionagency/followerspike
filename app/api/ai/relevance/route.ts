import { NextResponse } from "next/server";
import { z } from "zod";
import { scoreRelevance } from "@/lib/ai/generators";
import { requireAppSession } from "@/lib/session";

const RelevanceBodySchema = z.object({
  targetPost: z.string().min(10).max(3000),
});

export async function POST(request: Request) {
  try {
    const session = await requireAppSession();
    const body = RelevanceBodySchema.parse((await request.json()) as unknown);
    const relevance = await scoreRelevance({ profile: session.profile }, body.targetPost);
    return NextResponse.json(relevance);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Relevance scoring failed" }, { status: 500 });
  }
}

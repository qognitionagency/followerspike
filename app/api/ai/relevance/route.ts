import { NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect";
import { z } from "zod";
import { promptUserContext, scoreRelevanceResult } from "@/lib/ai/generators";
import { requireAppSession } from "@/lib/session";
import { checkRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { recordError } from "@/lib/observability/log";
import { getWorkspace } from "@/lib/workspace";

const RelevanceBodySchema = z.object({
  targetPost: z.string().min(10).max(3000),
});

export async function POST(request: Request) {
  try {
    const session = await requireAppSession();

    // Authenticated, but still metered. Tier caps in lib/automation govern what
    // may be published; nothing governed how often a generation could be asked
    // for, so a client stuck in a retry loop billed straight through to the AI
    // provider. Per user rather than per IP: the account is the payer.
    const throttle = await checkRateLimit({
      bucket: `ai-relevance:${session.userId}`,
      limit: 90,
      windowSeconds: 3600,
    });
    if (!throttle.allowed) {
      return NextResponse.json(
        { error: "Too many generations in the last hour.", retryAfterSeconds: throttle.retryAfterSeconds },
        { status: 429, headers: rateLimitHeaders(throttle) }
      );
    }
    const body = RelevanceBodySchema.parse((await request.json()) as unknown);

    // Attribution only for the cost row; scoring works without a workspace.
    const workspace = await getWorkspace(session);

    const relevance = await scoreRelevanceResult(promptUserContext(session.profile), body.targetPost, {
      workspaceId: workspace?.workspace.id ?? null,
      userId: session.userId,
    });

    // The prompt's own threshold is "act on 7 or higher". A score returned from
    // a failed call is not a score, so this reports the outage instead of
    // handing the caller a number it would act on.
    if (!relevance.ok) {
      const status = relevance.reason === "no_provider_configured" ? 503 : 502;
      return NextResponse.json({ error: "Relevance scoring is unavailable" }, { status });
    }

    return NextResponse.json(relevance.value);
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
    await recordError(error, { source: "api/ai/relevance", requestPath: "/api/ai/relevance" });
    return NextResponse.json({ error: "Relevance scoring failed" }, { status: 500 });
  }
}

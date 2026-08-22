import { NextResponse } from "next/server";
import { z } from "zod";
import { getFreeTool } from "@/lib/marketing/content";
import { freeToolRequestSchema, runFreeTool } from "@/lib/marketing/free-tools";
import { databaseConfigured, db } from "@/lib/db";
import { linkSnapshotToLead } from "@/lib/rank/store";
import { checkRateLimit, clientIp, rateLimitHeaders } from "@/lib/security/rate-limit";
import { recordError } from "@/lib/observability/log";

type RouteContext = {
  params: {
    slug: string;
  };
};

const UtmSchema = z.object({
  utm_source: z.string().max(120).optional(),
  utm_medium: z.string().max(120).optional(),
  utm_campaign: z.string().max(120).optional(),
  utm_term: z.string().max(120).optional(),
  utm_content: z.string().max(120).optional(),
});

function schemaForTool(slug: string) {
  const base = freeToolRequestSchema.merge(UtmSchema);

  // A handle used to be all this accepted, which was the wrong contract: X has
  // no public profile read, so a bare handle gave the scorer nothing to score.
  // It takes the pasted profile now, exactly as the LinkedIn one does.
  if (slug === "spike-rank-x") {
    return base.extend({
      primaryText: z
        .string()
        .min(60, { message: "Paste more of your profile, at least your name, handle, and bio" })
        .max(4000),
    });
  }

  if (slug === "spike-rank-bluesky") {
    return base.extend({
      primaryText: z
        .string()
        .trim()
        .transform((value) => value.replace(/^@/, "").replace(/^(?:https?:\/\/)?bsky\.app\/profile\//i, ""))
        .refine((handle) => /^[a-z0-9][a-z0-9.-]{1,252}[a-z0-9]$/i.test(handle) && handle.includes("."), {
          message: "Enter a Bluesky handle, like yourname.bsky.social",
        }),
    });
  }

  if (slug === "spike-rank-linkedin") {
    return base.extend({
      primaryText: z
        .string()
        .min(120, { message: "Paste more of your profile, at least your headline and About section" })
        .max(4000),
    });
  }

  if (slug === "thread-splitter" || slug === "cross-post-rewriter") {
    return base.extend({ primaryText: z.string().min(40).max(4000) });
  }

  if (slug === "hook-analyzer") {
    return base.extend({ primaryText: z.string().min(8).max(400) });
  }

  return base.extend({ primaryText: z.string().min(6).max(1200) });
}

/**
 * What one visitor may spend here.
 *
 * This route is public, runs an AI generation on most slugs and writes a lead
 * row from an unverified email, so before these limits the ceiling was whatever
 * a loop could reach. Two buckets: a per-tool allowance generous enough that
 * nobody legitimately trying a tool will meet it, and a lower overall ceiling so
 * the per-tool limits cannot simply be summed by walking every slug.
 */
const PER_TOOL_HOURLY = 10;
const PER_VISITOR_HOURLY = 25;

export async function POST(request: Request, context: RouteContext) {
  const tool = getFreeTool(context.params.slug);
  if (!tool) {
    return NextResponse.json({ error: "Unknown free tool" }, { status: 404 });
  }

  const ip = clientIp(request);
  const overall = await checkRateLimit({
    bucket: `free-tool:all:${ip}`,
    limit: PER_VISITOR_HOURLY,
    windowSeconds: 3600,
  });
  const perTool = overall.allowed
    ? await checkRateLimit({
        bucket: `free-tool:${tool.slug}:${ip}`,
        limit: PER_TOOL_HOURLY,
        windowSeconds: 3600,
      })
    : overall;

  if (!overall.allowed || !perTool.allowed) {
    const exceeded = overall.allowed ? perTool : overall;
    return NextResponse.json(
      {
        error: "Too many requests. Try again shortly, or create an account for higher limits.",
        retryAfterSeconds: exceeded.retryAfterSeconds,
      },
      { status: 429, headers: rateLimitHeaders(exceeded) }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schemaForTool(tool.slug).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await runFreeTool(tool.slug, parsed.data);

  if (parsed.data.email && databaseConfigured()) {
    try {
      const sql = db();
      const inputSummary = {
        primaryText: parsed.data.primaryText.slice(0, 500),
        context: parsed.data.context?.slice(0, 500) ?? null,
      };
      const resultSummary = {
        title: result.title,
        score: result.score ?? null,
        summary: result.summary.slice(0, 500),
      };

      const rows = await sql`
        insert into free_tool_leads
          (email, tool_slug, input_summary, result_summary, utm_source, utm_medium, utm_campaign, utm_term, utm_content)
        values (
          ${parsed.data.email},
          ${tool.slug},
          ${JSON.stringify(inputSummary)}::jsonb,
          ${JSON.stringify(resultSummary)}::jsonb,
          ${parsed.data.utm_source ?? null},
          ${parsed.data.utm_medium ?? null},
          ${parsed.data.utm_campaign ?? null},
          ${parsed.data.utm_term ?? null},
          ${parsed.data.utm_content ?? null}
        )
        returning id
      `;

      const leadId = rows[0]?.id as string | undefined;
      if (leadId) {
        result.leadId = leadId;
        if (result.snapshotId) {
          await linkSnapshotToLead(result.snapshotId, leadId);
        }
      }
    } catch (error) {
      // Public tools should still return the instant result when lead capture is
      // unavailable locally. Recorded rather than swallowed: silently dropping
      // every captured lead is exactly the failure nobody notices.
      await recordError(error, {
        source: "api/free-tools",
        kind: "lead_capture_failed",
        requestPath: `/api/free-tools/${tool.slug}`,
        context: { tool: tool.slug },
      });
    }
  }

  return NextResponse.json(result, { headers: rateLimitHeaders(perTool) });
}

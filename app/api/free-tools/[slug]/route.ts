import { NextResponse } from "next/server";
import { z } from "zod";
import { getFreeTool } from "@/lib/marketing/content";
import { freeToolRequestSchema, runFreeTool } from "@/lib/marketing/free-tools";
import { databaseConfigured, db } from "@/lib/db";
import { linkSnapshotToLead } from "@/lib/rank/store";

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

  if (slug === "spike-rank-x") {
    return base.extend({
      primaryText: z
        .string()
        .trim()
        .transform((value) => value.replace(/^@/, "").replace(/^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\//i, ""))
        .refine((handle) => /^[A-Za-z0-9_]{1,15}$/.test(handle), {
          message: "Enter an X handle, like @yourhandle",
        }),
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
        .min(120, { message: "Paste more of your profile — at least your headline and About section" })
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

export async function POST(request: Request, context: RouteContext) {
  const tool = getFreeTool(context.params.slug);
  if (!tool) {
    return NextResponse.json({ error: "Unknown free tool" }, { status: 404 });
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
    } catch {
      // Public tools should still return the instant result when lead capture is unavailable locally.
    }
  }

  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getFreeTool } from "@/lib/marketing/content";
import { freeToolRequestSchema, runFreeTool } from "@/lib/marketing/free-tools";
import { optionalEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

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
  if (slug === "linkedin-profile-audit") {
    return base.extend({
      primaryText: z.string().url().refine(
        (url) => {
          try {
            return /(^|\.)linkedin\.com$/i.test(new URL(url).hostname.replace(/^www\./, ""));
          } catch {
            return false;
          }
        },
        {
          message: "Enter a valid LinkedIn profile URL",
        },
      ),
    });
  }
  if (slug === "linkedin-comment-generator") {
    return base.extend({ primaryText: z.string().min(20).max(4000) });
  }
  if (slug === "linkedin-post-generator" || slug === "linkedin-content-calendar") {
    return base.extend({ primaryText: z.string().min(6).max(1200) });
  }
  return base;
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

  if (parsed.data.email && optionalEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("free_tool_leads")
        .insert({
          email: parsed.data.email,
          tool_slug: tool.slug,
          input_summary: {
            primaryText: parsed.data.primaryText.slice(0, 500),
            context: parsed.data.context?.slice(0, 500) ?? null,
          },
          result_summary: {
            title: result.title,
            score: result.score ?? null,
            summary: result.summary.slice(0, 500),
          },
          utm_source: parsed.data.utm_source,
          utm_medium: parsed.data.utm_medium,
          utm_campaign: parsed.data.utm_campaign,
          utm_term: parsed.data.utm_term,
          utm_content: parsed.data.utm_content,
        })
        .select("id")
        .single();

      if (data?.id) {
        result.leadId = data.id;
      }
    } catch {
      // Public tools should still return the instant result when lead capture is unavailable locally.
    }
  }

  return NextResponse.json(result);
}

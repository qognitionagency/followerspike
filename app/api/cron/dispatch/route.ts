import { Receiver } from "@upstash/qstash";
import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluateSafety, randomizedDelaySeconds } from "@/lib/automation/safety";
import { dispatchWorkerJob } from "@/lib/automation/worker";
import { optionalEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAutomationGlobalPause } from "@/lib/admin/settings";
import type { ApprovalMode, AutomationAction, SubscriptionTier } from "@/lib/constants";
import type { WorkerJob } from "@/lib/types";

const CronBodySchema = z.object({
  now: z.string().datetime().optional(),
});

type UserRow = {
  id: string;
  timezone: string;
  approval_mode: ApprovalMode;
  autopilot_enabled: boolean;
  autopilot_paused: boolean;
  autopilot_accepted_at: string | null;
  risk_acknowledged_at: string | null;
  consecutive_error_count: number;
  created_at: string;
};

type SubscriptionRow = {
  tier: SubscriptionTier;
  status: string;
};

type UsageRow = {
  posts_today: number;
  comments_today: number;
  invites_today: number;
  likes_today: number;
};

type ScheduledItem = {
  id: string;
  user_id: string;
  action: AutomationAction;
  body: string;
  targetUrl?: string;
  approvedByUser: boolean;
  table: "posts" | "comments" | "connections";
};

async function verifyQStash(request: Request, rawBody: string): Promise<boolean> {
  const currentSigningKey = optionalEnv("QSTASH_CURRENT_SIGNING_KEY");
  const nextSigningKey = optionalEnv("QSTASH_NEXT_SIGNING_KEY");
  if (!currentSigningKey || !nextSigningKey) {
    return process.env.NODE_ENV !== "production";
  }

  const signature = request.headers.get("upstash-signature");
  if (!signature) return false;
  const receiver = new Receiver({ currentSigningKey, nextSigningKey });
  return receiver.verify({
    signature,
    body: rawBody,
    url: request.url,
  });
}

async function logOutcome(params: {
  supabase: ReturnType<typeof createAdminClient>;
  userId: string;
  action: AutomationAction;
  outcome: "success" | "skipped" | "failed" | "paused";
  reason: string;
  targetUrl?: string;
  error?: string;
}) {
  await params.supabase.from("automation_log").insert({
    user_id: params.userId,
    action: params.action,
    outcome: params.outcome,
    reason: params.reason,
    target_url: params.targetUrl,
    error: params.error,
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verified = await verifyQStash(request, rawBody);
  if (!verified) {
    return NextResponse.json({ error: "Invalid QStash signature" }, { status: 401 });
  }

  let json: unknown = {};
  try {
    json = rawBody ? (JSON.parse(rawBody) as unknown) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = CronBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cron body" }, { status: 400 });
  }

  const now = parsed.data.now ? new Date(parsed.data.now) : new Date();
  const supabase = createAdminClient();
  const isoNow = now.toISOString();
  const globalPause = await getAutomationGlobalPause();

  if (globalPause.paused) {
    return NextResponse.json({
      delivered: 0,
      skipped: 0,
      inspected: 0,
      paused: true,
      reason: globalPause.reason,
    });
  }

  const [{ data: postsData }, { data: commentsData }, { data: connectionsData }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, user_id, content, linkedin_post_url, approved_by_user")
      .eq("status", "scheduled")
      .lte("scheduled_at", isoNow)
      .limit(20),
    supabase
      .from("comments")
      .select("id, user_id, generated_comment, target_post_url, approved_by_user")
      .eq("status", "scheduled")
      .lte("scheduled_at", isoNow)
      .limit(20),
    supabase
      .from("connections")
      .select("id, user_id, target_profile_url, personalized_note")
      .eq("status", "queued")
      .lte("scheduled_at", isoNow)
      .limit(20),
  ]);

  const items: ScheduledItem[] = [
    ...(((postsData as Array<{ id: string; user_id: string; content: string; linkedin_post_url: string | null; approved_by_user: boolean }> | null) ?? []).map(
      (post) => ({
        id: post.id,
        user_id: post.user_id,
        action: "post" as const,
        body: post.content,
        targetUrl: post.linkedin_post_url ?? undefined,
        approvedByUser: post.approved_by_user,
        table: "posts" as const,
      })
    )),
    ...(((commentsData as Array<{ id: string; user_id: string; generated_comment: string; target_post_url: string; approved_by_user: boolean }> | null) ?? []).map(
      (comment) => ({
        id: comment.id,
        user_id: comment.user_id,
        action: "comment" as const,
        body: comment.generated_comment,
        targetUrl: comment.target_post_url,
        approvedByUser: comment.approved_by_user,
        table: "comments" as const,
      })
    )),
    ...(((connectionsData as Array<{ id: string; user_id: string; target_profile_url: string; personalized_note: string | null }> | null) ?? []).map(
      (connection) => ({
        id: connection.id,
        user_id: connection.user_id,
        action: "invite" as const,
        body: connection.personalized_note ?? "",
        targetUrl: connection.target_profile_url,
        approvedByUser: true,
        table: "connections" as const,
      })
    )),
  ];

  let delivered = 0;
  let skipped = 0;

  for (const item of items) {
    const [{ data: userData }, { data: subscriptionData }, { data: usageData }] = await Promise.all([
      supabase
        .from("users")
        .select("id, timezone, approval_mode, autopilot_enabled, autopilot_paused, autopilot_accepted_at, risk_acknowledged_at, consecutive_error_count, created_at")
        .eq("id", item.user_id)
        .single(),
      supabase
        .from("subscriptions")
        .select("tier, status")
        .eq("user_id", item.user_id)
        .in("status", ["active", "trialing", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("user_daily_usage").select("*").eq("user_id", item.user_id).maybeSingle(),
    ]);

    const user = userData as UserRow | null;
    const subscription = subscriptionData as SubscriptionRow | null;
    const usage = (usageData as UsageRow | null) ?? {
      posts_today: 0,
      comments_today: 0,
      invites_today: 0,
      likes_today: 0,
    };

    if (!user) {
      skipped += 1;
      continue;
    }

    const safety = evaluateSafety({
      tier: subscription?.tier ?? "free",
      action: item.action,
      approvalMode: user.approval_mode,
      autopilotEnabled: user.autopilot_enabled,
      autopilotPaused: user.autopilot_paused,
      autopilotAcceptedAt: user.autopilot_accepted_at,
      riskAcknowledgedAt: user.risk_acknowledged_at,
      userCreatedAt: user.created_at,
      timezone: user.timezone,
      consecutiveErrorCount: user.consecutive_error_count,
      approvedByUser: item.approvedByUser,
      usageToday: {
        posts: usage.posts_today,
        comments: usage.comments_today,
        invites: usage.invites_today,
        likes: usage.likes_today,
      },
      now,
    });

    if (!safety.allowed) {
      skipped += 1;
      await logOutcome({
        supabase,
        userId: item.user_id,
        action: item.action,
        outcome: safety.reason.includes("paused") ? "paused" : "skipped",
        reason: safety.reason,
        targetUrl: item.targetUrl,
      });
      continue;
    }

    const delay = randomizedDelaySeconds();
    const job: WorkerJob = {
      jobId: item.id,
      userId: item.user_id,
      action: item.action,
      targetUrl: item.targetUrl,
      payload: { body: item.body },
      scheduledAt: new Date(now.getTime() + delay * 1000).toISOString(),
      safety: {
        minDelaySeconds: safety.minDelaySeconds,
        maxDelaySeconds: safety.maxDelaySeconds,
        windowStartHour: 9,
        windowEndHour: 18,
        approvalMode: user.approval_mode,
        dailyLimit: safety.dailyLimit,
      },
    };

    const result = await dispatchWorkerJob(job);
    if (result.delivered) {
      delivered += 1;
      await supabase
        .from("users")
        .update({ consecutive_error_count: 0, last_error_at: null })
        .eq("id", item.user_id);
      await logOutcome({
        supabase,
        userId: item.user_id,
        action: item.action,
        outcome: "success",
        reason: "dispatched_to_worker",
        targetUrl: item.targetUrl,
      });
    } else {
      skipped += 1;
      const nextErrorCount = user.consecutive_error_count + 1;
      await supabase
        .from("users")
        .update({
          consecutive_error_count: nextErrorCount,
          last_error_at: new Date().toISOString(),
          autopilot_paused: nextErrorCount >= 3,
          autopilot_pause_reason: nextErrorCount >= 3 ? "three_consecutive_worker_errors" : user.autopilot_paused ? "user_paused" : null,
        })
        .eq("id", item.user_id);
      await logOutcome({
        supabase,
        userId: item.user_id,
        action: item.action,
        outcome: "failed",
        reason: "worker_delivery_failed",
        targetUrl: item.targetUrl,
        error: result.body,
      });
    }
  }

  return NextResponse.json({ delivered, skipped, inspected: items.length });
}

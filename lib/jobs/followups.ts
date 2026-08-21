/**
 * What happens *because* a post went out.
 *
 * A published post is the trigger for every automation the product sells by
 * name — the first comment under it, the plug hours later, the mirror onto the
 * other networks, the watch for people replying with a keyword. This module is
 * the one place that turns "a variant published" into those queued jobs, so
 * `publish_variant` stays about publishing and the fan-out rules live together
 * where they can be read at once.
 *
 * Every enqueue here carries an idempotency key. A publish that is retried after
 * the platform accepted it, or a thread whose items publish minutes apart, must
 * not produce two plugs — and `enqueue` treats a duplicate key as success, so
 * the keys are the whole mechanism.
 *
 * Nothing in here may throw into the caller. By the time it runs, the post is
 * already live on a platform; failing the job at that point would retry a
 * publish that already happened, and the claim would correctly refuse to do it
 * again — leaving the follow-ups unscheduled and the job dead for no reason.
 */
import { db, databaseConfigured } from "@/lib/db";
import { enqueue } from "@/lib/jobs/queue";
import { supports } from "@/lib/platforms/registry";
import { logAutomationEvent } from "@/lib/automation/usage";
import {
  activeAutomations,
  autoPlugConfig,
  commentCaptureConfig,
  crossPostRelayConfig,
  firstCommentConfig,
} from "@/lib/automations/store";
import type { Platform, PostCreatedVia } from "@/lib/types/db";

export type PublishedVariant = {
  variantId: string;
  postId: string;
  platform: Platform;
  threadOrder: number;
  workspaceId: string;
  userId: string;
  firstComment: string | null;
};

/** How the post came to exist. A relay of a relay is a loop, and this is what stops it. */
async function createdVia(postId: string): Promise<PostCreatedVia | null> {
  const sql = db();
  const rows = (await sql`select created_via from posts where id = ${postId} limit 1`) as {
    created_via: PostCreatedVia;
  }[];
  return rows[0]?.created_via ?? null;
}

/**
 * Queues the follow-on work for one freshly published variant.
 *
 * Called after the platform has accepted the post and `platform_post_id` is
 * recorded, because every job scheduled here needs that id to exist.
 */
export async function scheduleFollowUps(variant: PublishedVariant): Promise<void> {
  if (!databaseConfigured()) return;

  try {
    await queueFirstComment(variant);

    // The rest fire once per post, not once per thread item. Item 3 of a thread
    // publishing is not a second post to plug, mirror, or watch.
    if (variant.threadOrder !== 0) return;

    await queueAutoPlug(variant);
    await queueRelay(variant);
    await queueCapture(variant);
  } catch (error) {
    // Recorded rather than raised: see the module comment.
    await logAutomationEvent({
      workspaceId: variant.workspaceId,
      userId: variant.userId,
      postId: variant.postId,
      action: "automation.schedule",
      outcome: "failed",
      reason: (error instanceof Error ? error.message : String(error)).slice(0, 500),
      meta: { variant_id: variant.variantId },
    });
  }
}

/**
 * The first comment, if there is one to post.
 *
 * Two sources, one job: the text the author wrote for this specific post, or the
 * automation's standing template. The key is per post and platform so a thread
 * gets one comment under it rather than one per item.
 */
async function queueFirstComment(variant: PublishedVariant): Promise<void> {
  if (!supports(variant.platform, "supportsThreads")) return;

  const automations = await activeAutomations(variant.workspaceId, "first_comment");
  const automation = automations[0] ?? null;
  const hasTemplate = automation ? Boolean(firstCommentConfig(automation).template) : false;

  if (!variant.firstComment && !hasTemplate) return;

  await enqueue({
    kind: "first_comment",
    payload: {
      // The parent is the item that carries the text, or the head of the thread
      // when the text comes from the automation.
      variantId: variant.variantId,
      automationId: automation?.id ?? null,
    },
    idempotencyKey: `first_comment:${variant.postId}:${variant.platform}`,
    workspaceId: variant.workspaceId,
  });
}

/** The plug, scheduled for however many hours out the automation asks for. */
async function queueAutoPlug(variant: PublishedVariant): Promise<void> {
  if (!supports(variant.platform, "supportsThreads")) return;

  for (const automation of await activeAutomations(variant.workspaceId, "auto_plug")) {
    const config = autoPlugConfig(automation);
    if (!config) continue;

    // An automation bound to one account only plugs that account's posts.
    if (automation.social_account_id && !(await variantBelongsToAccount(variant.variantId, automation.social_account_id))) {
      continue;
    }

    await enqueue({
      kind: "auto_plug",
      payload: { variantId: variant.variantId, automationId: automation.id },
      runAt: new Date(Date.now() + config.hoursAfter * 3_600_000),
      idempotencyKey: `auto_plug:${variant.variantId}:${automation.id}`,
      workspaceId: variant.workspaceId,
    });
  }
}

/** The mirror onto other networks. Skipped for a post that is itself a mirror. */
async function queueRelay(variant: PublishedVariant): Promise<void> {
  const origin = await createdVia(variant.postId);
  if (origin === "relay") return;

  for (const automation of await activeAutomations(variant.workspaceId, "cross_post_relay")) {
    const config = crossPostRelayConfig(automation);
    if (!config) continue;

    await enqueue({
      kind: "cross_post_relay",
      payload: { postId: variant.postId, automationId: automation.id, sourcePlatform: variant.platform },
      runAt: new Date(Date.now() + config.delayMinutes * 60_000),
      // Per post rather than per variant: a post published to X and Bluesky at
      // once must produce one relay, not two mirrors of the same text.
      idempotencyKey: `cross_post_relay:${variant.postId}:${automation.id}`,
      workspaceId: variant.workspaceId,
    });
  }
}

/** The keyword watch. Only where the platform lets us read replies at all. */
async function queueCapture(variant: PublishedVariant): Promise<void> {
  if (!supports(variant.platform, "readReplies")) return;

  for (const automation of await activeAutomations(variant.workspaceId, "comment_capture")) {
    const config = commentCaptureConfig(automation);
    if (!config) continue;

    await enqueue({
      kind: "lead_poll",
      payload: { variantId: variant.variantId, automationId: automation.id, sequence: 0 },
      // The first look waits one interval: replies arriving in the first seconds
      // are rare, and a poll against an empty thread is a wasted platform read.
      runAt: new Date(Date.now() + config.pollMinutes * 60_000),
      idempotencyKey: `lead_poll:${variant.variantId}:${automation.id}:0`,
      workspaceId: variant.workspaceId,
    });
  }
}

async function variantBelongsToAccount(variantId: string, socialAccountId: string): Promise<boolean> {
  const sql = db();
  const rows = await sql`
    select 1 from post_variants
    where id = ${variantId} and social_account_id = ${socialAccountId}
    limit 1
  `;
  return rows.length > 0;
}

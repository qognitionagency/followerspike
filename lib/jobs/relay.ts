/**
 * Mirroring a published post to the platforms it did not go out on.
 *
 * The relay runs after the original has published rather than beside it, which
 * is why it is a queued job and not another entry in the composer's platform
 * list. The point of the delay is that the same text arriving on three networks
 * in the same second reads as a broadcast; an hour apart it reads as a person
 * posting.
 *
 * Like every other automation in this directory, it publishes nothing. It
 * creates a draft and schedules it, so the mirrored post goes out through
 * `publish_variant` with the same safety gate, the same per-platform splitting,
 * and the same double-post claim as anything the author wrote by hand.
 */
import { db, databaseConfigured } from "@/lib/db";
import { PermanentJobError } from "@/lib/jobs/handlers";
import type { Job } from "@/lib/jobs/queue";
import { tierForUser } from "@/lib/jobs/tier";
import { createDraft, schedulePost } from "@/lib/compose/composer";
import { activeConnections } from "@/lib/platforms/connect";
import { logAutomationEvent } from "@/lib/automation/usage";
import { crossPostRelayConfig, getAutomation, markAutomationRun } from "@/lib/automations/store";
import type { Platform } from "@/lib/types/db";

type SourcePost = {
  post_id: string;
  workspace_id: string;
  user_id: string;
};

/**
 * The original text, reassembled.
 *
 * A post that was split into a thread is stored as one variant per item, and
 * the mirror wants the whole thought rather than its first 280 characters —
 * `createDraft` re-splits for the target platform anyway. Joining on a blank
 * line is an approximation of the split that produced them, which is the
 * closest thing to the original available: the pre-split text is not stored.
 */
async function sourceText(postId: string, platform: Platform): Promise<string> {
  const sql = db();
  const rows = (await sql`
    select content
    from post_variants
    where post_id = ${postId} and platform = ${platform}
    order by thread_order asc
  `) as { content: string }[];

  return rows.map((row) => row.content).join("\n\n").trim();
}

/** Platforms this post already exists on, so a relay never mirrors onto itself. */
async function existingPlatforms(postId: string): Promise<Set<Platform>> {
  const sql = db();
  const rows = (await sql`
    select distinct platform from post_variants where post_id = ${postId}
  `) as { platform: Platform }[];
  return new Set(rows.map((row) => row.platform));
}

/** A relay that already produced a post. The retry guard: `create` then `schedule` is two statements and a job can die between them. */
async function alreadyRelayed(postId: string): Promise<boolean> {
  const sql = db();
  const rows = await sql`
    select 1 from posts
    where source_post_id = ${postId} and created_via = 'relay'
    limit 1
  `;
  return rows.length > 0;
}

export async function crossPostRelay(job: Job): Promise<void> {
  if (!databaseConfigured()) throw new Error("The database is not configured");

  const postId = job.payload?.postId;
  const automationId = job.payload?.automationId;
  const sourcePlatform = job.payload?.sourcePlatform;

  if (typeof postId !== "string" || typeof automationId !== "string" || typeof sourcePlatform !== "string") {
    throw new PermanentJobError("cross_post_relay requires a postId, an automationId and a sourcePlatform");
  }

  const sql = db();
  const rows = (await sql`
    select id as post_id, workspace_id, user_id from posts where id = ${postId} limit 1
  `) as SourcePost[];
  const post = rows[0];
  if (!post) return; // Deleted between publishing and the relay falling due.

  const automation = await getAutomation(post.workspace_id, automationId);
  if (!automation || !automation.is_active) {
    await logAutomationEvent({
      workspaceId: post.workspace_id,
      userId: post.user_id,
      postId,
      action: "automation.cross_post_relay",
      outcome: "skipped",
      reason: "the automation was switched off before the relay fell due",
    });
    return;
  }

  const config = crossPostRelayConfig(automation);
  if (!config) {
    throw new PermanentJobError("The relay automation names no target platforms");
  }

  if (await alreadyRelayed(postId)) {
    await logAutomationEvent({
      workspaceId: post.workspace_id,
      userId: post.user_id,
      postId,
      automationId: automation.id,
      action: "automation.cross_post_relay",
      outcome: "skipped",
      reason: "this post has already been relayed",
    });
    return;
  }

  const taken = await existingPlatforms(postId);
  const connected = new Set((await activeConnections(post.workspace_id)).map((account) => account.platform));
  const targets = config.platforms.filter((platform) => !taken.has(platform) && connected.has(platform));

  if (targets.length === 0) {
    // Either the post already covered every target, or the accounts for them are
    // gone. Both are ordinary and neither improves by retrying.
    await logAutomationEvent({
      workspaceId: post.workspace_id,
      userId: post.user_id,
      postId,
      automationId: automation.id,
      action: "automation.cross_post_relay",
      outcome: "skipped",
      reason: "no connected target platform is left to relay to",
      meta: { configured: config.platforms, already_posted: [...taken] },
    });
    return;
  }

  const content = await sourceText(postId, sourcePlatform as Platform);
  if (!content) {
    throw new PermanentJobError("The source post has no content to relay");
  }

  // Simulation is decided here for the same reason it is in `lib/jobs/reply.ts`:
  // the post this would create goes out as an ordinary scheduled post, and the
  // safety gate never sees the automation that asked for it.
  if (automation.dry_run) {
    await logAutomationEvent({
      workspaceId: post.workspace_id,
      userId: post.user_id,
      postId,
      automationId: automation.id,
      action: "automation.cross_post_relay",
      outcome: "skipped",
      reason: `dry_run: would have relayed to ${targets.join(", ")}`,
      meta: { targets, characters: content.length },
    });
    return;
  }

  const draft = await createDraft({
    workspaceId: post.workspace_id,
    userId: post.user_id,
    content,
    platforms: targets,
    createdVia: "relay",
    sourcePostId: postId,
  });

  if (!draft.ok) {
    await logAutomationEvent({
      workspaceId: post.workspace_id,
      userId: post.user_id,
      postId,
      automationId: automation.id,
      action: "automation.cross_post_relay",
      outcome: "failed",
      reason: draft.error,
    });
    // A disconnected account or text that cannot be represented on the target
    // will fail the same way on every retry.
    throw new PermanentJobError(draft.error);
  }

  // Now, not later: the wait the user configured was spent in the queue before
  // this handler ran, so scheduling further out would delay it twice.
  const scheduled = await schedulePost({
    workspaceId: post.workspace_id,
    userId: post.user_id,
    postId: draft.postId,
    scheduledAt: new Date(),
    tier: await tierForUser(post.user_id),
  });

  if (!scheduled.ok) {
    await logAutomationEvent({
      workspaceId: post.workspace_id,
      userId: post.user_id,
      postId: draft.postId,
      automationId: automation.id,
      action: "automation.cross_post_relay",
      outcome: "blocked",
      reason: scheduled.error,
      meta: { source_post_id: postId },
    });
    // Left as a draft, matching the evergreen handler: an entitlement denial is
    // a reason to upgrade, not to throw away a post the user will want.
    return;
  }

  await markAutomationRun(automation.id);

  await logAutomationEvent({
    workspaceId: post.workspace_id,
    userId: post.user_id,
    postId: draft.postId,
    automationId: automation.id,
    action: "automation.cross_post_relay",
    outcome: "success",
    reason: `Relayed to ${targets.join(", ")}`,
    meta: { source_post_id: postId, targets },
  });
}

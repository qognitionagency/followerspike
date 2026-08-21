import { db, databaseConfigured } from "@/lib/db";
import { PermanentJobError } from "@/lib/jobs/handlers";
import type { Job } from "@/lib/jobs/queue";
import { claimNextDue } from "@/lib/evergreen/store";
import { createDraft, schedulePost } from "@/lib/compose/composer";
import { logAutomationEvent } from "@/lib/automation/usage";
import { normalizeSubscriptionTier, type SubscriptionTier } from "@/lib/constants";
import type { Platform } from "@/lib/types/db";

/**
 * Recycling one evergreen item back into the queue.
 *
 * This handler deliberately does not publish anything itself. It creates a post
 * and schedules it, which hands the work to `publish_variant` — the one path
 * that owns the safety gate, the double-post claim, and the usage counters. A
 * second publisher here would be a second place for all of that to be wrong.
 */

/** How far out a recycled post lands. Far enough that a user who did not want it can still cancel. */
const LEAD_TIME_MINUTES = 30;

async function tierFor(userId: string): Promise<SubscriptionTier> {
  const sql = db();
  const rows = await sql`
    select tier from subscriptions
    where user_id = ${userId} and status in ('active', 'trialing', 'past_due')
    order by created_at desc
    limit 1
  `;
  return normalizeSubscriptionTier(rows[0]?.tier);
}

export async function evergreenRefill(job: Job): Promise<void> {
  if (!databaseConfigured()) throw new Error("The database is not configured");

  // The workspace comes from the job row, not the payload: the payload is
  // attacker-shaped data in every other handler and there is no reason to make
  // this one the exception.
  const workspaceId = job.workspace_id;
  if (!workspaceId) {
    throw new PermanentJobError("evergreen_refill requires a workspace");
  }

  const item = await claimNextDue(workspaceId);
  if (!item) {
    // Not a failure. An empty or fully-cooling library is the normal state of a
    // small account, and retrying would not change it.
    await logAutomationEvent({
      workspaceId,
      action: "evergreen.refill",
      outcome: "skipped",
      reason: "no item is due",
      meta: { job_id: job.id },
    });
    return;
  }

  const platforms = (item.platforms ?? []) as Platform[];
  if (platforms.length === 0) {
    await logAutomationEvent({
      workspaceId,
      userId: item.user_id,
      action: "evergreen.refill",
      outcome: "skipped",
      reason: "item has no target platforms",
      meta: { evergreen_item_id: item.id },
    });
    return;
  }

  const draft = await createDraft({
    workspaceId,
    userId: item.user_id,
    content: item.content,
    platforms,
    createdVia: "evergreen",
  });

  if (!draft.ok) {
    // A disconnected account or an over-length item cannot be fixed by running
    // again, and the item has already spent its cooldown, so this stops here
    // rather than burning retries.
    await logAutomationEvent({
      workspaceId,
      userId: item.user_id,
      action: "evergreen.refill",
      outcome: "failed",
      reason: draft.error,
      meta: { evergreen_item_id: item.id },
    });
    throw new PermanentJobError(draft.error);
  }

  const scheduledAt = new Date(Date.now() + LEAD_TIME_MINUTES * 60_000);
  const scheduled = await schedulePost({
    workspaceId,
    userId: item.user_id,
    postId: draft.postId,
    scheduledAt,
    tier: await tierFor(item.user_id),
  });

  if (!scheduled.ok) {
    await logAutomationEvent({
      workspaceId,
      userId: item.user_id,
      postId: draft.postId,
      action: "evergreen.refill",
      outcome: "blocked",
      reason: scheduled.error,
      meta: { evergreen_item_id: item.id },
    });
    // Left as a draft rather than deleted: the user can still publish it by hand,
    // and an entitlement denial is a reason to upgrade, not to lose the post.
    return;
  }

  await logAutomationEvent({
    workspaceId,
    userId: item.user_id,
    postId: draft.postId,
    action: "evergreen.refill",
    outcome: "success",
    reason: `Recycled for ${platforms.join(", ")}`,
    meta: {
      evergreen_item_id: item.id,
      use_count: item.use_count + 1,
      scheduled_at: scheduledAt.toISOString(),
    },
  });
}

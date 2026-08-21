/**
 * Replying under a post we already published: the first comment, and the plug.
 *
 * Both handlers here do the same physical thing — put one more piece of text
 * under something the account posted — so they share the mechanism and differ
 * only in where the text comes from and when it runs.
 *
 * Neither publishes anything itself. They append a variant to the parent post
 * and enqueue `publish_variant`, exactly as the evergreen handler does. That is
 * not indirection for its own sake: `publish_variant` owns the claim that stops
 * a retry posting twice under someone's name, the safety gate, and the usage
 * counters, and a second publisher would be a second place for all three to be
 * wrong. Appending as a variant also means the reply gets its `replyTo` for
 * free, because `parentRef` already resolves the preceding thread position.
 *
 * A reply is charged to the `comments` budget rather than `posts`. The pricing
 * page sells those as separate daily caps, so spending a post allowance on a
 * first comment would quietly make both numbers false.
 */
import { db, databaseConfigured } from "@/lib/db";
import { PermanentJobError } from "@/lib/jobs/handlers";
import { enqueue, type Job } from "@/lib/jobs/queue";
import { characterLength } from "@/lib/platforms/types";
import { maxChars, supports } from "@/lib/platforms/registry";
import { logAutomationEvent } from "@/lib/automation/usage";
import {
  autoPlugConfig,
  firstCommentConfig,
  getAutomation,
  markAutomationRun,
  unmeasurableTrigger,
} from "@/lib/automations/store";
import type { Platform } from "@/lib/types/db";

type ParentVariant = {
  id: string;
  post_id: string;
  platform: Platform;
  social_account_id: string | null;
  first_comment: string | null;
  thread_order: number;
  platform_post_id: string | null;
  workspace_id: string;
  user_id: string;
};

/** The variant a reply job was pointed at, with the columns both handlers need. */
async function loadVariant(variantId: string): Promise<ParentVariant | null> {
  const sql = db();
  const rows = (await sql`
    select
      v.id, v.post_id, v.platform, v.social_account_id, v.first_comment,
      v.thread_order, v.platform_post_id, p.workspace_id, p.user_id
    from post_variants v
    join posts p on p.id = v.post_id
    where v.id = ${variantId}
    limit 1
  `) as ParentVariant[];
  return rows[0] ?? null;
}

/** True while any earlier item of the same thread is still unpublished. */
async function threadIncomplete(postId: string, platform: Platform): Promise<boolean> {
  const sql = db();
  const rows = await sql`
    select count(*)::int as pending
    from post_variants
    where post_id = ${postId} and platform = ${platform} and platform_post_id is null
  `;
  return ((rows[0]?.pending as number) ?? 0) > 0;
}

/**
 * Adds the reply as the next item on the parent's thread and queues it.
 *
 * The `not exists` guard is the idempotency: a job that inserted the variant and
 * then died before enqueuing runs again from the top, and without the guard the
 * second run would append a duplicate whose own publish key is different — two
 * identical replies under one post. Matching on content is enough here because
 * a handler only ever appends one specific piece of text per parent.
 */
async function appendReply(input: {
  parent: ParentVariant;
  content: string;
  workspaceId: string;
}): Promise<{ variantId: string } | { skipped: string }> {
  const { parent, content } = input;
  const sql = db();

  const trimmed = content.trim();
  if (!trimmed) return { skipped: "the reply text is empty" };

  const limit = maxChars(parent.platform);
  if (characterLength(trimmed) > limit) {
    // Not split into a thread: a plug or a first comment that arrives as three
    // chained replies is a different thing from the one the user wrote.
    return { skipped: `the reply is ${characterLength(trimmed)} characters and ${parent.platform} allows ${limit}` };
  }

  // The guards live in HAVING, not WHERE. An aggregate select with no GROUP BY
  // returns exactly one row however its WHERE filters — so with the checks in
  // WHERE this inserted a row with thread_order 1 even when the duplicate it was
  // supposed to catch existed, and even when the parent had no variants at all.
  // HAVING filters the aggregate row itself, which is the only thing that
  // suppresses the insert.
  const rows = (await sql`
    insert into post_variants (post_id, social_account_id, platform, content, thread_order)
    select
      ${parent.post_id},
      ${parent.social_account_id},
      ${parent.platform},
      ${trimmed},
      coalesce(max(v.thread_order), 0) + 1
    from post_variants v
    where v.post_id = ${parent.post_id} and v.platform = ${parent.platform}
    having count(*) > 0
      and not exists (
        select 1 from post_variants existing
        where existing.post_id = ${parent.post_id}
          and existing.platform = ${parent.platform}
          and existing.content = ${trimmed}
      )
    returning id
  `) as { id: string }[];

  const variantId = rows[0]?.id;
  if (!variantId) return { skipped: "this reply has already been queued" };

  await enqueue({
    kind: "publish_variant",
    // `as: "comments"` is what keeps a reply off the daily post allowance.
    payload: { variantId, postId: parent.post_id, as: "comments" },
    idempotencyKey: `publish_variant:${variantId}`,
    workspaceId: input.workspaceId,
  });

  return { variantId };
}

/**
 * Guards the two things that make a reply impossible on a platform rather than
 * merely unwise, and are worth checking before any database work.
 *
 * `supportsThreads` is the right flag: replying under our own post is exactly
 * what an adapter needs to publish a thread, and it is false on LinkedIn, whose
 * comment endpoint is not available to us at the scopes we hold. The honest
 * outcome there is a skipped run, not a failed one.
 */
function unsupportedReason(platform: Platform): string | null {
  if (!supports(platform, "supportsThreads")) {
    return `${platform} has no API we can post a reply through`;
  }
  return null;
}

/**
 * Whether this run is a simulation, decided here rather than at the safety gate.
 *
 * `assertCanRun` reads `dry_run` off the automation row, but only when it is
 * given an `automationId` — and the publish these handlers queue is an ordinary
 * `publish_variant` job that carries none, because it is the author's own post
 * being replied to. So a simulating automation would sail through the gate and
 * post. The decision belongs at the point the automation decides to act, which
 * is here, before anything is written.
 */
export function isSimulated(automation: { dry_run: boolean } | null): boolean {
  return automation?.dry_run ?? false;
}

// ---------------------------------------------------------------------------
// first_comment
// ---------------------------------------------------------------------------

/**
 * Posts the prepared first comment under a published post.
 *
 * The text comes from `post_variants.first_comment` — a column that has existed
 * since the v2 migration and that nothing has ever read — falling back to the
 * automation's template when the author did not write one for this specific
 * post.
 */
export async function firstComment(job: Job): Promise<void> {
  if (!databaseConfigured()) throw new Error("The database is not configured");

  const variantId = job.payload?.variantId;
  if (typeof variantId !== "string") {
    throw new PermanentJobError("first_comment requires a variantId");
  }

  const parent = await loadVariant(variantId);
  if (!parent) return; // The post was deleted between publishing and this run.

  if (!parent.platform_post_id) {
    throw new PermanentJobError("The parent post was never published");
  }

  const skip = unsupportedReason(parent.platform);
  if (skip) {
    await logAutomationEvent({
      workspaceId: parent.workspace_id,
      userId: parent.user_id,
      postId: parent.post_id,
      action: "automation.first_comment",
      outcome: "skipped",
      reason: skip,
      meta: { variant_id: parent.id },
    });
    return;
  }

  // A thread's first comment belongs under the finished thread, not in the
  // middle of it. Thrown rather than returned so the ordinary retry backoff
  // does the waiting — items are staggered thirty seconds apart, so this
  // resolves inside the first retry for any thread of a sane length.
  if (await threadIncomplete(parent.post_id, parent.platform)) {
    throw new Error("Waiting for the rest of the thread to publish");
  }

  const automationId = typeof job.payload?.automationId === "string" ? job.payload.automationId : null;
  const automation = automationId ? await getAutomation(parent.workspace_id, automationId) : null;

  const content = parent.first_comment ?? (automation ? firstCommentConfig(automation).template : null);
  if (!content) {
    await logAutomationEvent({
      workspaceId: parent.workspace_id,
      userId: parent.user_id,
      postId: parent.post_id,
      action: "automation.first_comment",
      outcome: "skipped",
      reason: "no first comment was written for this post and the automation has no template",
      meta: { variant_id: parent.id },
    });
    return;
  }

  // A comment the author wrote for this post is not the automation acting, so
  // it publishes even while the automation simulates; the template is the part
  // being tried out.
  if (!parent.first_comment && isSimulated(automation)) {
    await logAutomationEvent({
      workspaceId: parent.workspace_id,
      userId: parent.user_id,
      postId: parent.post_id,
      automationId: automation?.id ?? null,
      action: "automation.first_comment",
      outcome: "skipped",
      reason: "dry_run: would have posted the fallback first comment",
      meta: { variant_id: parent.id, content },
    });
    return;
  }

  const result = await appendReply({ parent, content, workspaceId: parent.workspace_id });

  if ("skipped" in result) {
    await logAutomationEvent({
      workspaceId: parent.workspace_id,
      userId: parent.user_id,
      postId: parent.post_id,
      action: "automation.first_comment",
      outcome: "skipped",
      reason: result.skipped,
      meta: { variant_id: parent.id },
    });
    return;
  }

  if (automation) await markAutomationRun(automation.id);

  await logAutomationEvent({
    workspaceId: parent.workspace_id,
    userId: parent.user_id,
    postId: parent.post_id,
    automationId: automation?.id ?? null,
    action: "automation.first_comment",
    outcome: "success",
    reason: `Queued the first comment under the ${parent.platform} post`,
    meta: { variant_id: result.variantId, parent_variant_id: parent.id },
  });
}

// ---------------------------------------------------------------------------
// auto_plug
// ---------------------------------------------------------------------------

/**
 * Posts the plug reply once the parent post has had time to travel.
 *
 * The delay is the whole feature: a link dropped under a post in its first
 * minute reaches nobody and reads as an ad, so the job is enqueued with a
 * `run_at` hours out and this handler runs when the queue says it is due. It
 * does not re-check reach, because nothing in this codebase can measure reach —
 * see `unmeasurableTrigger`.
 */
export async function autoPlug(job: Job): Promise<void> {
  if (!databaseConfigured()) throw new Error("The database is not configured");

  const variantId = job.payload?.variantId;
  const automationId = job.payload?.automationId;
  if (typeof variantId !== "string" || typeof automationId !== "string") {
    throw new PermanentJobError("auto_plug requires a variantId and an automationId");
  }

  const parent = await loadVariant(variantId);
  if (!parent) return;

  if (!parent.platform_post_id) {
    throw new PermanentJobError("The parent post was never published");
  }

  const automation = await getAutomation(parent.workspace_id, automationId);
  if (!automation || !automation.is_active) {
    // Switched off between the post going out and the plug falling due. That is
    // a user changing their mind, and it is the answer.
    await logAutomationEvent({
      workspaceId: parent.workspace_id,
      userId: parent.user_id,
      postId: parent.post_id,
      action: "automation.auto_plug",
      outcome: "skipped",
      reason: "the automation was switched off before the plug fell due",
      meta: { variant_id: parent.id },
    });
    return;
  }

  const unmeasurable = unmeasurableTrigger(automation);
  if (unmeasurable) {
    // Refusing beats approximating. A user who set `min_impressions` asked for
    // the plug to be conditional; firing anyway would ignore the condition and
    // treating it as satisfied would be a guess made under their name.
    await logAutomationEvent({
      workspaceId: parent.workspace_id,
      userId: parent.user_id,
      postId: parent.post_id,
      automationId: automation.id,
      action: "automation.auto_plug",
      outcome: "skipped",
      reason: `the trigger requires ${unmeasurable}, which no connected platform exposes to us`,
      meta: { variant_id: parent.id },
    });
    return;
  }

  const skip = unsupportedReason(parent.platform);
  if (skip) {
    await logAutomationEvent({
      workspaceId: parent.workspace_id,
      userId: parent.user_id,
      postId: parent.post_id,
      automationId: automation.id,
      action: "automation.auto_plug",
      outcome: "skipped",
      reason: skip,
      meta: { variant_id: parent.id },
    });
    return;
  }

  const config = autoPlugConfig(automation);
  if (!config) {
    throw new PermanentJobError("The plug automation has no text to post");
  }

  if (await threadIncomplete(parent.post_id, parent.platform)) {
    throw new Error("Waiting for the rest of the thread to publish");
  }

  const content = config.link ? `${config.template}\n\n${config.link}` : config.template;

  if (isSimulated(automation)) {
    await logAutomationEvent({
      workspaceId: parent.workspace_id,
      userId: parent.user_id,
      postId: parent.post_id,
      automationId: automation.id,
      action: "automation.auto_plug",
      outcome: "skipped",
      reason: "dry_run: would have posted the plug",
      meta: { variant_id: parent.id, content },
    });
    return;
  }

  const result = await appendReply({ parent, content, workspaceId: parent.workspace_id });

  if ("skipped" in result) {
    await logAutomationEvent({
      workspaceId: parent.workspace_id,
      userId: parent.user_id,
      postId: parent.post_id,
      automationId: automation.id,
      action: "automation.auto_plug",
      outcome: "skipped",
      reason: result.skipped,
      meta: { variant_id: parent.id },
    });
    return;
  }

  await markAutomationRun(automation.id);

  await logAutomationEvent({
    workspaceId: parent.workspace_id,
    userId: parent.user_id,
    postId: parent.post_id,
    automationId: automation.id,
    action: "automation.auto_plug",
    outcome: "success",
    reason: `Queued the plug ${config.hoursAfter}h after the ${parent.platform} post`,
    meta: { variant_id: result.variantId, parent_variant_id: parent.id },
  });
}

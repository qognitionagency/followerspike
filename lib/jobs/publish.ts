import { db, databaseConfigured } from "@/lib/db";
import { PermanentJobError } from "@/lib/jobs/handlers";
import type { Job } from "@/lib/jobs/queue";
import { getAdapter } from "@/lib/platforms/registry";
import { getPlatformCredentials, SocialAccountNotFoundError } from "@/lib/platforms/tokens";
import {
  PlatformAuthError,
  PlatformContentError,
  PlatformNotConfiguredError,
  PlatformUnsupportedError,
  type PostRef,
} from "@/lib/platforms/types";
import { assertCanRun } from "@/lib/automation/safety";
import { incrementUsage, logAutomationEvent, recordFailure, recordSuccess } from "@/lib/automation/usage";
import type { Platform } from "@/lib/types/db";

/**
 * Publishing one variant to one platform.
 *
 * The single most important correctness property in this codebase is that a
 * retry never posts twice under someone's name. `post_variants.platform_post_id`
 * is the record of "this already went out", and the claim below is what makes
 * checking it race-free.
 */

type VariantRow = {
  id: string;
  post_id: string;
  platform: Platform;
  content: string;
  thread_order: number;
  social_account_id: string | null;
  platform_post_id: string | null;
  first_comment: string | null;
  user_id: string;
  workspace_id: string;
};

/**
 * Claims the variant for this attempt.
 *
 * `where platform_post_id is null` plus the returned row count is the whole
 * guarantee: two runners racing the same variant, or one runner retrying after
 * a timeout that actually succeeded, see zero rows on the second attempt and
 * stop. Checking with a SELECT first and then updating would leave exactly the
 * window this closes.
 */
async function claimVariant(variantId: string): Promise<VariantRow | null> {
  const sql = db();
  const rows = (await sql`
    update post_variants v
    set error_message = null
    from posts p
    where v.id = ${variantId}
      and p.id = v.post_id
      and v.platform_post_id is null
    returning
      v.id, v.post_id, v.platform, v.content, v.thread_order, v.social_account_id,
      v.platform_post_id, v.first_comment, p.user_id, p.workspace_id
  `) as VariantRow[];
  return rows[0] ?? null;
}

/** The already-published parent of a thread item, so the reply can point at it. */
async function parentRef(postId: string, platform: Platform, threadOrder: number): Promise<PostRef | null> {
  if (threadOrder === 0) return null;
  const sql = db();
  const rows = await sql`
    select platform_post_id, platform_post_url
    from post_variants
    where post_id = ${postId} and platform = ${platform} and thread_order = ${threadOrder - 1}::int
    limit 1
  `;
  const id = rows[0]?.platform_post_id as string | undefined;
  if (!id) return null;

  // Only the id is persisted — there is no column for a CID or a thread root.
  // The Bluesky adapter backfills both from the id when it needs them, at the
  // cost of one extra round trip per reply.
  const root = await sql`
    select platform_post_id
    from post_variants
    where post_id = ${postId} and platform = ${platform} and thread_order = 0
    limit 1
  `;
  const rootId = (root[0]?.platform_post_id as string | undefined) ?? id;
  return { id, rootId };
}

/** Rolls the parent post's status up once its variants resolve. */
async function settlePostStatus(postId: string): Promise<void> {
  const sql = db();
  await sql`
    update posts p
    set
      status = case
        when not exists (select 1 from post_variants v where v.post_id = p.id and v.platform_post_id is null)
          then 'published'
        when exists (select 1 from post_variants v where v.post_id = p.id and v.platform_post_id is not null)
          then 'publishing'
        else p.status
      end,
      published_at = case
        when not exists (select 1 from post_variants v where v.post_id = p.id and v.platform_post_id is null)
             and p.published_at is null
          then now()
        else p.published_at
      end,
      updated_at = now()
    where p.id = ${postId}
  `;
}

export async function publishVariant(job: Job): Promise<void> {
  if (!databaseConfigured()) throw new Error("The database is not configured");

  const variantId = job.payload?.variantId;
  if (typeof variantId !== "string") {
    throw new PermanentJobError("publish_variant requires a variantId");
  }

  const variant = await claimVariant(variantId);
  if (!variant) {
    // Either already published — the retry case this exists for — or the row is
    // gone. Both are terminal, and neither is an error worth alarming anyone.
    return;
  }

  // The gate runs after the claim so a blocked attempt still holds the variant
  // and cannot be picked up concurrently, and before any network call so a
  // paused account never reaches a platform.
  const decision = await assertCanRun({
    workspaceId: variant.workspace_id,
    userId: variant.user_id,
    field: "posts",
    // The author picked this time, so quiet hours do not apply to it.
    userScheduled: true,
  });

  if (!decision.allowed) {
    // Thrown, not swallowed: the job retries after its backoff, which is what
    // a cap or a pause wants — the post is still wanted, just not now.
    throw new Error(`Blocked by safety gate: ${decision.reason}`);
  }

  const sql = db();

  if (decision.dryRun) {
    await logAutomationEvent({
      workspaceId: variant.workspace_id,
      userId: variant.user_id,
      postId: variant.post_id,
      action: `publish.${variant.platform}`,
      outcome: "skipped",
      reason: "dry_run",
      meta: { variant_id: variant.id },
    });
    return;
  }

  if (!variant.social_account_id) {
    throw new PermanentJobError(`No connected ${variant.platform} account for this post`);
  }

  try {
    // Throws SocialAccountNotFoundError when the row is gone, and a
    // PlatformAuthError when the stored credential can no longer be refreshed.
    // Both are caught below and classified as permanent.
    const credentials = await getPlatformCredentials(variant.social_account_id);

    const adapter = getAdapter(variant.platform);
    const replyTo = await parentRef(variant.post_id, variant.platform, variant.thread_order);

    const result = await adapter.publish(credentials, {
      content: variant.content,
      replyTo: replyTo ?? undefined,
    });

    await sql`
      update post_variants
      set platform_post_id = ${result.platformPostId},
          platform_post_url = ${result.platformPostUrl},
          published_at = now(),
          error_message = null
      where id = ${variant.id}
    `;

    await incrementUsage(variant.user_id, variant.workspace_id, "posts");
    await recordSuccess(variant.user_id);
    await settlePostStatus(variant.post_id);

    await logAutomationEvent({
      workspaceId: variant.workspace_id,
      userId: variant.user_id,
      postId: variant.post_id,
      action: `publish.${variant.platform}`,
      outcome: "success",
      meta: { variant_id: variant.id, platform_post_id: result.platformPostId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await sql`update post_variants set error_message = ${message.slice(0, 2000)} where id = ${variant.id}`;

    await logAutomationEvent({
      workspaceId: variant.workspace_id,
      userId: variant.user_id,
      postId: variant.post_id,
      action: `publish.${variant.platform}`,
      outcome: "failed",
      reason: message.slice(0, 500),
      meta: { variant_id: variant.id },
    });

    // A revoked token, an unsupported request, or content the platform refuses
    // will fail identically on every retry, so they stop here and pause the
    // account's streak counter instead of burning five attempts.
    const permanent =
      error instanceof PlatformAuthError ||
      error instanceof PlatformContentError ||
      error instanceof PlatformUnsupportedError ||
      error instanceof PlatformNotConfiguredError ||
      error instanceof PermanentJobError ||
      error instanceof SocialAccountNotFoundError;

    if (permanent) {
      await recordFailure(variant.user_id, `Publishing to ${variant.platform} failed: ${message.slice(0, 180)}`);
      await sql`update posts set status = 'failed', updated_at = now() where id = ${variant.post_id}`;
      throw new PermanentJobError(message);
    }

    throw error;
  }
}

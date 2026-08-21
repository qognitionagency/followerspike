import { db, databaseConfigured } from "@/lib/db";
import { enqueue } from "@/lib/jobs/queue";
import { canSchedulePost } from "@/lib/entitlements";
import { maxChars } from "@/lib/platforms/registry";
import { PLATFORM_LIMIT, THREADABLE, splitIntoThread, type ThreadPlatform } from "@/lib/compose/thread";
import { activeConnections } from "@/lib/platforms/connect";
import type { Platform, PostVariant } from "@/lib/types/db";
import type { SubscriptionTier } from "@/lib/constants";

/**
 * Turning one piece of writing into per-platform posts.
 *
 * `posts` carries no content column — the text lives entirely in
 * `post_variants`, one row per platform per thread position, which is what
 * `unique (post_id, platform, thread_order)` exists to enforce. A "thread" is
 * therefore just variants 0..n sharing a post and a platform.
 */

export type ComposeInput = {
  workspaceId: string;
  userId: string;
  content: string;
  platforms: Platform[];
  /** Adds " 1/n" counters, whose characters are budgeted before splitting. */
  numbered?: boolean;
  createdVia?: "manual" | "ai" | "voice_cloner" | "growth_plan" | "evergreen" | "relay";
};

export type ComposePreview = {
  platform: Platform;
  items: string[];
  limit: number;
  /** True when the text cannot be published as-is — only reachable on a platform that cannot thread. */
  overLimit: boolean;
};

/**
 * What each platform would actually publish, without writing anything.
 *
 * Drives the editor's live preview, and is the same function the save path uses
 * — a preview that disagreed with what got stored would be worse than none.
 */
export function previewForPlatforms(content: string, platforms: Platform[], numbered = false): ComposePreview[] {
  return platforms.map((platform) => {
    const threadPlatform = platform as ThreadPlatform;
    const limit = PLATFORM_LIMIT[threadPlatform] ?? maxChars(platform);
    const items = splitIntoThread(content, { platform: threadPlatform, numbered });
    const overLimit =
      !THREADABLE[threadPlatform] && items.some((item) => Array.from(item).length > limit);
    return { platform, items, limit, overLimit };
  });
}

export type SaveResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };

/**
 * Creates a draft post and its variants.
 *
 * Variants are written in one statement per platform rather than one per item:
 * the Neon HTTP driver has no interactive transaction, so the fewer round trips
 * that can half-succeed, the better.
 */
export async function createDraft(input: ComposeInput): Promise<SaveResult> {
  if (!databaseConfigured()) return { ok: false, error: "The database is not configured" };
  if (!input.content.trim()) return { ok: false, error: "Write something first" };
  if (input.platforms.length === 0) return { ok: false, error: "Choose at least one platform" };

  const previews = previewForPlatforms(input.content, input.platforms, input.numbered);
  const tooLong = previews.find((preview) => preview.overLimit);
  if (tooLong) {
    return {
      ok: false,
      error: `${tooLong.platform} allows ${tooLong.limit.toLocaleString()} characters and cannot be split into a thread.`,
    };
  }

  // Only connected accounts may be targeted; a variant pointing at nothing
  // would fail at publish time instead of here, hours later.
  const connected = await activeConnections(input.workspaceId);
  const accountFor = new Map(connected.map((account) => [account.platform, account.id]));
  const missing = input.platforms.filter((platform) => !accountFor.has(platform));
  if (missing.length > 0) {
    return { ok: false, error: `Connect an account for ${missing.join(", ")} first.` };
  }

  const sql = db();
  const isThread = previews.some((preview) => preview.items.length > 1);

  const postRows = await sql`
    insert into posts (workspace_id, user_id, status, is_thread, created_via)
    values (${input.workspaceId}, ${input.userId}, 'draft', ${isThread}, ${input.createdVia ?? "manual"})
    returning id
  `;
  const postId = postRows[0]?.id as string | undefined;
  if (!postId) return { ok: false, error: "Could not save the draft" };

  for (const preview of previews) {
    const accountId = accountFor.get(preview.platform) ?? null;
    for (const [index, item] of preview.items.entries()) {
      await sql`
        insert into post_variants (post_id, social_account_id, platform, content, thread_order)
        values (${postId}, ${accountId}, ${preview.platform}, ${item}, ${index}::int)
        on conflict (post_id, platform, thread_order) do update set content = excluded.content
      `;
    }
  }

  return { ok: true, postId };
}

/**
 * Moves a draft to scheduled and queues the work.
 *
 * One job per variant, keyed on the variant id so re-scheduling the same post
 * cannot produce a second publish of the same item. Thread order is preserved
 * by staggering `run_at`: item 1 must not go out before item 0 exists, since it
 * replies to it.
 */
export async function schedulePost(input: {
  workspaceId: string;
  userId: string;
  postId: string;
  scheduledAt: Date;
  tier: SubscriptionTier;
}): Promise<SaveResult> {
  if (!databaseConfigured()) return { ok: false, error: "The database is not configured" };

  const allowed = await canSchedulePost(input.workspaceId, input.tier);
  if (!allowed.allowed) return { ok: false, error: allowed.reason };

  const sql = db();

  const updated = await sql`
    update posts
    set status = 'scheduled', scheduled_at = ${input.scheduledAt.toISOString()}, updated_at = now()
    where id = ${input.postId}
      and workspace_id = ${input.workspaceId}
      and status in ('draft', 'scheduled', 'failed')
    returning id
  `;
  if (updated.length === 0) return { ok: false, error: "That post can no longer be scheduled" };

  const variants = (await sql`
    select v.id, v.platform, v.thread_order
    from post_variants v
    join posts p on p.id = v.post_id
    where v.post_id = ${input.postId} and p.workspace_id = ${input.workspaceId}
      and v.platform_post_id is null
    order by v.platform asc, v.thread_order asc
  `) as Pick<PostVariant, "id" | "platform" | "thread_order">[];

  for (const variant of variants) {
    // Thirty seconds between thread items: enough for the parent to exist and
    // for its id to be recorded before the reply that references it runs.
    const runAt = new Date(input.scheduledAt.getTime() + variant.thread_order * 30_000);
    await enqueue({
      kind: "publish_variant",
      payload: { variantId: variant.id, postId: input.postId },
      runAt,
      idempotencyKey: `publish_variant:${variant.id}`,
      workspaceId: input.workspaceId,
    });
  }

  return { ok: true, postId: input.postId };
}

/** Publishing now is scheduling for now — one path, so the queue stays the only thing that publishes. */
export async function publishNow(input: {
  workspaceId: string;
  userId: string;
  postId: string;
  tier: SubscriptionTier;
}): Promise<SaveResult> {
  return schedulePost({ ...input, scheduledAt: new Date() });
}

/**
 * Cancels a post.
 *
 * Variants already carrying a `platform_post_id` are left alone — they are
 * live on a platform, and marking them cancelled here would misreport what the
 * account actually published.
 */
export async function cancelPost(input: { workspaceId: string; postId: string }): Promise<boolean> {
  if (!databaseConfigured()) return false;
  const sql = db();
  const rows = await sql`
    update posts
    set status = 'cancelled', scheduled_at = null, updated_at = now()
    where id = ${input.postId} and workspace_id = ${input.workspaceId} and status <> 'published'
    returning id
  `;
  return rows.length > 0;
}

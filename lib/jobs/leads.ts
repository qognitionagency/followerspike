/**
 * Keyword capture, and the delivery that follows it.
 *
 * The loop the product sells is: publish a post, invite people to reply with a
 * word, send whoever does the thing they asked for. `lead_poll` is the watching
 * half and `deliver_lead_email` is the sending half, and they are separate jobs
 * because they fail for unrelated reasons — a platform read that rate-limits
 * should not cost an email its retries.
 *
 * The important limit is stated plainly rather than worked around: replies do
 * not come with email addresses. Delivery is possible only when the reply
 * itself contains one, which is what "reply with your email and the word
 * PLAYBOOK" is for. A capture with no address is still recorded as a lead —
 * the handle is worth having — and logged as undeliverable rather than
 * pretending an email went out.
 */
import { db, databaseConfigured } from "@/lib/db";
import { PermanentJobError } from "@/lib/jobs/handlers";
import { enqueue, type Job } from "@/lib/jobs/queue";
import { getAdapter, supports } from "@/lib/platforms/registry";
import { getPlatformCredentials, SocialAccountNotFoundError } from "@/lib/platforms/tokens";
import { PlatformAuthError, PlatformUnsupportedError } from "@/lib/platforms/types";
import { logAutomationEvent } from "@/lib/automation/usage";
import { commentCaptureConfig, getAutomation, markAutomationRun } from "@/lib/automations/store";
import { sendLeadDeliveryEmail } from "@/lib/email/resend";
import type { Platform } from "@/lib/types/db";

/** Deliberately conservative: it must not match a URL, a handle, or the tail of a sentence. */
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/;

/** One page of replies per poll. The platforms cap lower than this anyway; the adapters clamp. */
const REPLY_PAGE_SIZE = 100;

/**
 * A ceiling on how many times one post is polled, independent of the window.
 *
 * A misconfigured 15-minute poll over a 72-hour window is 288 platform reads for
 * a single post, and the queue would happily run every one of them. This caps
 * the cost of a bad configuration at something survivable.
 */
const MAX_POLLS_PER_POST = 96;

type CaptureVariant = {
  id: string;
  post_id: string;
  platform: Platform;
  social_account_id: string | null;
  platform_post_id: string | null;
  published_at: string | null;
  workspace_id: string;
  user_id: string;
};

async function loadVariant(variantId: string): Promise<CaptureVariant | null> {
  const sql = db();
  const rows = (await sql`
    select
      v.id, v.post_id, v.platform, v.social_account_id, v.platform_post_id, v.published_at,
      p.workspace_id, p.user_id
    from post_variants v
    join posts p on p.id = v.post_id
    where v.id = ${variantId}
    limit 1
  `) as CaptureVariant[];
  return rows[0] ?? null;
}

/**
 * Whether this reply is asking for the thing.
 *
 * Matched on a word boundary rather than a substring: a keyword of "PLAY" must
 * not fire on "player", or the first stranger to use an ordinary English word
 * under the post gets an email they never asked for.
 */
export function mentionsKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, "iu").test(text);
}

/**
 * The address to deliver to, if the reply carried one.
 *
 * Lower-cased so the same person replying twice is one lead rather than two,
 * and returned as null rather than an empty string so the caller's `if (email)`
 * cannot accidentally treat "no address" as a deliverable one.
 */
export function extractEmail(text: string): string | null {
  return text.match(EMAIL_PATTERN)?.[0]?.toLowerCase() ?? null;
}

// ---------------------------------------------------------------------------
// lead_poll
// ---------------------------------------------------------------------------

export async function leadPoll(job: Job): Promise<void> {
  if (!databaseConfigured()) throw new Error("The database is not configured");

  const variantId = job.payload?.variantId;
  const automationId = job.payload?.automationId;
  if (typeof variantId !== "string" || typeof automationId !== "string") {
    throw new PermanentJobError("lead_poll requires a variantId and an automationId");
  }
  const sequence = typeof job.payload?.sequence === "number" ? job.payload.sequence : 0;

  const variant = await loadVariant(variantId);
  if (!variant) return;

  if (!variant.platform_post_id || !variant.social_account_id) {
    throw new PermanentJobError("The post being watched was never published");
  }

  const automation = await getAutomation(variant.workspace_id, automationId);
  if (!automation || !automation.is_active) {
    await logAutomationEvent({
      workspaceId: variant.workspace_id,
      userId: variant.user_id,
      postId: variant.post_id,
      action: "automation.lead_poll",
      outcome: "skipped",
      reason: "capture was switched off",
      meta: { variant_id: variant.id },
    });
    return;
  }

  const config = commentCaptureConfig(automation);
  if (!config) {
    throw new PermanentJobError("The capture automation has no keyword or no delivery text");
  }

  if (!supports(variant.platform, "readReplies")) {
    await logAutomationEvent({
      workspaceId: variant.workspace_id,
      userId: variant.user_id,
      postId: variant.post_id,
      automationId: automation.id,
      action: "automation.lead_poll",
      outcome: "skipped",
      reason: `${variant.platform} does not let us read the replies on a post`,
      meta: { variant_id: variant.id },
    });
    return;
  }

  // The window runs from publication, not from the first poll, so a delayed
  // first run does not extend how long the post is watched.
  const startedAt = variant.published_at ? new Date(variant.published_at).getTime() : Date.now();
  const windowEnd = startedAt + config.windowHours * 3_600_000;
  if (Date.now() > windowEnd) return;

  let replies;
  try {
    const credentials = await getPlatformCredentials(variant.social_account_id);
    const adapter = getAdapter(variant.platform);
    replies = await adapter.fetchReplies(
      credentials,
      { id: variant.platform_post_id },
      { limit: REPLY_PAGE_SIZE }
    );
  } catch (error) {
    const permanent =
      error instanceof PlatformAuthError ||
      error instanceof PlatformUnsupportedError ||
      error instanceof SocialAccountNotFoundError;

    if (permanent) {
      const message = error instanceof Error ? error.message : String(error);
      await logAutomationEvent({
        workspaceId: variant.workspace_id,
        userId: variant.user_id,
        postId: variant.post_id,
        automationId: automation.id,
        action: "automation.lead_poll",
        outcome: "failed",
        reason: message.slice(0, 500),
        meta: { variant_id: variant.id },
      });
      throw new PermanentJobError(message);
    }
    // A rate limit or a blip: the ordinary backoff is the right answer, and the
    // next scheduled poll would find the same replies anyway.
    throw error;
  }

  const sql = db();
  let captured = 0;
  let deliverable = 0;

  for (const reply of replies) {
    if (!mentionsKeyword(reply.text, config.keyword)) continue;

    const email = extractEmail(reply.text);

    // `unique (user_id, platform, handle, automation_id)` makes a repeat poll a
    // no-op rather than a duplicate, which is what lets this job run every
    // thirty minutes over the same reply list without doing anything twice.
    const inserted = (await sql`
      insert into leads (workspace_id, user_id, automation_id, platform, handle, display_name, email, source_post_id, keyword)
      values (
        ${variant.workspace_id},
        ${variant.user_id},
        ${automation.id},
        ${variant.platform},
        ${reply.authorHandle},
        ${reply.authorDisplayName},
        ${email},
        ${variant.post_id},
        ${config.keyword}
      )
      on conflict (user_id, platform, handle, automation_id) do nothing
      returning id, email
    `) as { id: string; email: string | null }[];

    const lead = inserted[0];
    if (!lead) continue;
    captured += 1;

    if (lead.email && automation.dry_run) {
      // The capture itself is recorded even while simulating — it is a note of
      // who asked, not an action taken under the user's name. The email is the
      // part that reaches a stranger, so that is the part a simulation withholds.
      await logAutomationEvent({
        workspaceId: variant.workspace_id,
        userId: variant.user_id,
        postId: variant.post_id,
        automationId: automation.id,
        action: "automation.lead_delivery",
        outcome: "skipped",
        reason: "dry_run: would have emailed the captured lead",
        recipientHandle: reply.authorHandle,
        meta: { lead_id: lead.id },
      });
    } else if (lead.email) {
      deliverable += 1;
      await enqueue({
        kind: "deliver_lead_email",
        payload: { leadId: lead.id, automationId: automation.id },
        idempotencyKey: `deliver_lead_email:${lead.id}`,
        workspaceId: variant.workspace_id,
      });
    } else {
      await logAutomationEvent({
        workspaceId: variant.workspace_id,
        userId: variant.user_id,
        postId: variant.post_id,
        automationId: automation.id,
        action: "automation.lead_capture",
        outcome: "skipped",
        reason: "captured, but the reply carried no email address to deliver to",
        recipientHandle: reply.authorHandle,
        meta: { lead_id: lead.id },
      });
    }
  }

  if (captured > 0) {
    await markAutomationRun(automation.id);
    await logAutomationEvent({
      workspaceId: variant.workspace_id,
      userId: variant.user_id,
      postId: variant.post_id,
      automationId: automation.id,
      action: "automation.lead_capture",
      outcome: "success",
      reason: `Captured ${captured} new lead${captured === 1 ? "" : "s"}, ${deliverable} with an email address`,
      meta: { variant_id: variant.id, keyword: config.keyword },
    });
  }

  // Schedule the next look. Self-rescheduling rather than one job per interval
  // enqueued up front: the window is hours long, the automation can be switched
  // off inside it, and a queue full of polls for a post nobody is watching any
  // more is work that has to be cancelled rather than simply never created.
  const nextRunAt = new Date(Date.now() + config.pollMinutes * 60_000);
  if (nextRunAt.getTime() < windowEnd && sequence + 1 < MAX_POLLS_PER_POST) {
    await enqueue({
      kind: "lead_poll",
      payload: { variantId: variant.id, automationId: automation.id, sequence: sequence + 1 },
      runAt: nextRunAt,
      idempotencyKey: `lead_poll:${variant.id}:${automation.id}:${sequence + 1}`,
      workspaceId: variant.workspace_id,
    });
  }
}

// ---------------------------------------------------------------------------
// deliver_lead_email
// ---------------------------------------------------------------------------

type LeadRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  automation_id: string | null;
  handle: string;
  display_name: string | null;
  email: string | null;
  keyword: string | null;
  delivered_at: string | null;
  unsubscribed_at: string | null;
};

export async function deliverLeadEmail(job: Job): Promise<void> {
  if (!databaseConfigured()) throw new Error("The database is not configured");

  const leadId = job.payload?.leadId;
  if (typeof leadId !== "string") {
    throw new PermanentJobError("deliver_lead_email requires a leadId");
  }

  const sql = db();
  const rows = (await sql`select * from leads where id = ${leadId} limit 1`) as LeadRow[];
  const lead = rows[0];
  if (!lead) return;

  // Three terminal conditions, none of them errors: already sent, opted out, or
  // no address to send to.
  if (lead.delivered_at) return;
  if (lead.unsubscribed_at) {
    await logAutomationEvent({
      workspaceId: lead.workspace_id,
      userId: lead.user_id,
      automationId: lead.automation_id,
      action: "automation.lead_delivery",
      outcome: "skipped",
      reason: "the lead has unsubscribed",
      recipientHandle: lead.handle,
      meta: { lead_id: lead.id },
    });
    return;
  }
  if (!lead.email) {
    throw new PermanentJobError("This lead has no email address");
  }

  const automation = lead.automation_id ? await getAutomation(lead.workspace_id, lead.automation_id) : null;
  const config = automation ? commentCaptureConfig(automation) : null;
  if (!automation || !config) {
    throw new PermanentJobError("The automation that captured this lead no longer has delivery text");
  }

  // Second guard. `lead_poll` does not enqueue this job while simulating, but an
  // automation can be put back into simulation between capture and delivery, and
  // the queue would still be holding the job.
  if (automation.dry_run) {
    await logAutomationEvent({
      workspaceId: lead.workspace_id,
      userId: lead.user_id,
      automationId: automation.id,
      action: "automation.lead_delivery",
      outcome: "skipped",
      reason: "dry_run: would have emailed the captured lead",
      recipientHandle: lead.handle,
      meta: { lead_id: lead.id },
    });
    return;
  }

  const delivery = await sendLeadDeliveryEmail({
    to: lead.email,
    subject: config.subject,
    body: config.body,
    link: config.link,
    handle: lead.handle,
    leadId: lead.id,
  });

  if (delivery.status === "skipped") {
    // No Resend key on this deployment. Retrying will not conjure one, and
    // burning five attempts to discover that helps nobody.
    await logAutomationEvent({
      workspaceId: lead.workspace_id,
      userId: lead.user_id,
      automationId: lead.automation_id,
      action: "automation.lead_delivery",
      outcome: "failed",
      reason: "email delivery is not configured on this deployment",
      recipientHandle: lead.handle,
      meta: { lead_id: lead.id },
    });
    throw new PermanentJobError("Email delivery is not configured on this deployment");
  }

  await sql`update leads set delivered_at = now() where id = ${lead.id} and delivered_at is null`;

  await logAutomationEvent({
    workspaceId: lead.workspace_id,
    userId: lead.user_id,
    automationId: lead.automation_id,
    action: "automation.lead_delivery",
    outcome: "success",
    reason: `Delivered "${config.subject}"`,
    recipientHandle: lead.handle,
    meta: { lead_id: lead.id, message_id: delivery.id },
  });
}

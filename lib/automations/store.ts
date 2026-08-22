/**
 * Reading and writing `automations`.
 *
 * The table has existed since the v2 migration and nothing has ever selected
 * from it, which is why every automation job kind had a null handler: there was
 * no configuration for one to read. This module is that missing half.
 *
 * Two things are deliberate. First, `trigger` and `action` are jsonb, so every
 * value coming out of them is untrusted in exactly the way a request body is —
 * the parsers below narrow rather than cast, and a row whose config no longer
 * makes sense reads as "not configured" instead of throwing inside a job.
 * Second, `dry_run` defaults to true in the schema and nothing here quietly
 * flips it: an automation simulates until somebody arms it on purpose.
 */
import { db, databaseConfigured } from "@/lib/db";
import { isPlatform } from "@/lib/platforms/registry";
import type { Automation, AutomationKind, Platform } from "@/lib/types/db";

/**
 * The kinds this codebase can actually execute.
 *
 * This list, `AutomationKind`, and the table's check constraint are now the
 * same five values, which is the point: for a long time the constraint was
 * deliberately wider and named four kinds no handler implemented, so this
 * existed to keep them out of the UI. Those four were dropped in
 * 20260822140000 and 20260822170000, and the invariant to preserve is that a
 * kind is added to all three at once, in the same change that adds its handler.
 * The e2e test asserts the three stay in agreement.
 */
export const IMPLEMENTED_AUTOMATION_KINDS = [
  "first_comment",
  "auto_plug",
  "cross_post_relay",
  "comment_capture",
  "evergreen",
] as const satisfies readonly AutomationKind[];

export type ImplementedAutomationKind = (typeof IMPLEMENTED_AUTOMATION_KINDS)[number];

export function isImplementedKind(value: string): value is ImplementedAutomationKind {
  return (IMPLEMENTED_AUTOMATION_KINDS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/**
 * How long after the parent post a plug reply goes out. Bounded rather than
 * free-form: a plug that fires seconds after the post reads as spam, and one a
 * week later is replying to a dead thread.
 */
export const PLUG_DELAY_HOURS = { min: 1, max: 48, default: 4 } as const;

/** How long a capture automation keeps watching one post, and how often it looks. */
export const CAPTURE_WINDOW_HOURS = { min: 1, max: 72, default: 48 } as const;
export const CAPTURE_POLL_MINUTES = { min: 15, max: 240, default: 30 } as const;

/** How long a relay waits before mirroring. Zero is allowed; the same text landing on three platforms in the same second is a choice, not a bug. */
export const RELAY_DELAY_MINUTES = { min: 0, max: 1440, default: 60 } as const;

export type AutoPlugConfig = {
  hoursAfter: number;
  template: string;
  link: string | null;
};

export type FirstCommentConfig = {
  /** Used when the variant carries no `first_comment` of its own. Null means "only post a first comment I wrote myself". */
  template: string | null;
};

export type CrossPostRelayConfig = {
  delayMinutes: number;
  /** Where a published post is mirrored to. Platforms the post already targeted are skipped at run time. */
  platforms: Platform[];
};

export type CommentCaptureConfig = {
  keyword: string;
  windowHours: number;
  pollMinutes: number;
  /** What the captured lead is emailed. */
  subject: string;
  body: string;
  link: string | null;
};

/** Cadence for the evergreen library. The automation row is the opt-in; without one, nothing recycles on its own. */
export type EvergreenConfig = {
  /** At most one recycled post per this many days. */
  everyDays: number;
};

export const EVERGREEN_EVERY_DAYS = { min: 1, max: 30, default: 3 } as const;

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Clamps rather than rejects: a stored number outside its bounds is a config that drifted, not a reason to stop an automation the user armed. */
function readNumber(
  source: Record<string, unknown>,
  key: string,
  bounds: { min: number; max: number; default: number }
): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return bounds.default;
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(value)));
}

function readPlatforms(source: Record<string, unknown>, key: string): Platform[] {
  const value = source[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Platform => typeof item === "string" && isPlatform(item));
}

/** Null when the row cannot drive a run — a plug with no text to post has nothing to say. */
export function autoPlugConfig(automation: Automation): AutoPlugConfig | null {
  const template = readString(automation.action, "template");
  if (!template) return null;
  return {
    hoursAfter: readNumber(automation.trigger, "hours_after", PLUG_DELAY_HOURS),
    template,
    link: readString(automation.action, "link"),
  };
}

export function firstCommentConfig(automation: Automation): FirstCommentConfig {
  return { template: readString(automation.action, "template") };
}

export function crossPostRelayConfig(automation: Automation): CrossPostRelayConfig | null {
  const platforms = readPlatforms(automation.action, "platforms");
  if (platforms.length === 0) return null;
  return {
    delayMinutes: readNumber(automation.trigger, "delay_minutes", RELAY_DELAY_MINUTES),
    platforms,
  };
}

export function commentCaptureConfig(automation: Automation): CommentCaptureConfig | null {
  const keyword = readString(automation.trigger, "keyword");
  const body = readString(automation.action, "body");
  if (!keyword || !body) return null;
  return {
    keyword,
    windowHours: readNumber(automation.trigger, "window_hours", CAPTURE_WINDOW_HOURS),
    pollMinutes: readNumber(automation.trigger, "poll_minutes", CAPTURE_POLL_MINUTES),
    subject: readString(automation.action, "subject") ?? "The link you asked for",
    body,
    link: readString(automation.action, "link"),
  };
}

export function evergreenConfig(automation: Automation): EvergreenConfig {
  return { everyDays: readNumber(automation.trigger, "every_days", EVERGREEN_EVERY_DAYS) };
}

/**
 * True when the trigger names a condition nothing in this codebase can measure.
 *
 * `min_impressions` is the one that matters: it is a natural thing to write into
 * a plug trigger, no adapter exposes post metrics, and an automation that
 * silently ignored the threshold would fire on posts the user explicitly said
 * not to plug. Handlers refuse rather than approximate.
 */
export function unmeasurableTrigger(automation: Automation): string | null {
  const unsupported = ["min_impressions", "min_likes", "min_replies", "min_reposts"];
  const named = unsupported.find((key) => typeof automation.trigger[key] === "number");
  return named ?? null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Active automations of one kind for a workspace.
 *
 * Ordered oldest first so that a workspace with two rows of the same kind — which
 * the schema permits — behaves predictably rather than depending on row order.
 */
export async function activeAutomations(
  workspaceId: string,
  kind: AutomationKind
): Promise<Automation[]> {
  if (!databaseConfigured()) return [];
  const sql = db();
  return (await sql`
    select * from automations
    where workspace_id = ${workspaceId} and kind = ${kind} and is_active
    order by created_at asc
  `) as Automation[];
}

/** One automation, scoped. Returns null for a row in another workspace, which is the access check. */
export async function getAutomation(workspaceId: string, automationId: string): Promise<Automation | null> {
  if (!databaseConfigured()) return null;
  const sql = db();
  const rows = (await sql`
    select * from automations
    where id = ${automationId} and workspace_id = ${workspaceId}
    limit 1
  `) as Automation[];
  return rows[0] ?? null;
}

export async function listAutomations(workspaceId: string): Promise<Automation[]> {
  if (!databaseConfigured()) return [];
  const sql = db();
  return (await sql`
    select * from automations
    where workspace_id = ${workspaceId}
    order by kind asc, created_at asc
  `) as Automation[];
}

export type SaveAutomationInput = {
  workspaceId: string;
  userId: string;
  kind: ImplementedAutomationKind;
  socialAccountId?: string | null;
  trigger: Record<string, unknown>;
  action: Record<string, unknown>;
  dailyCap?: number;
  isActive: boolean;
  dryRun: boolean;
};

/**
 * Writes one automation per kind per workspace.
 *
 * The UI offers one row per kind, so this updates the existing row rather than
 * accumulating duplicates that would each fire on the same event. There is no
 * unique constraint behind that — the schema deliberately allows several — so
 * the update is scoped by kind and the insert only runs when none exists.
 */
export async function saveAutomation(input: SaveAutomationInput): Promise<Automation | null> {
  if (!databaseConfigured()) return null;
  const sql = db();

  const updated = (await sql`
    update automations
    set
      social_account_id = ${input.socialAccountId ?? null},
      trigger = ${JSON.stringify(input.trigger)}::jsonb,
      action = ${JSON.stringify(input.action)}::jsonb,
      daily_cap = coalesce(${input.dailyCap ?? null}::int, daily_cap),
      is_active = ${input.isActive},
      dry_run = ${input.dryRun}
    where workspace_id = ${input.workspaceId} and kind = ${input.kind}
    returning *
  `) as Automation[];

  if (updated[0]) return updated[0];

  const inserted = (await sql`
    insert into automations (workspace_id, user_id, social_account_id, kind, trigger, action, daily_cap, is_active, dry_run)
    values (
      ${input.workspaceId},
      ${input.userId},
      ${input.socialAccountId ?? null},
      ${input.kind},
      ${JSON.stringify(input.trigger)}::jsonb,
      ${JSON.stringify(input.action)}::jsonb,
      coalesce(${input.dailyCap ?? null}::int, 25),
      ${input.isActive},
      ${input.dryRun}
    )
    returning *
  `) as Automation[];

  return inserted[0] ?? null;
}

/** Stamped after a firing so the UI can show when an automation last did something. */
export async function markAutomationRun(automationId: string): Promise<void> {
  if (!databaseConfigured()) return;
  const sql = db();
  await sql`update automations set last_run_at = now() where id = ${automationId}`;
}

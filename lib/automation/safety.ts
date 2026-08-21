import { db, databaseConfigured } from "@/lib/db";
import { getAutomationGlobalPause } from "@/lib/admin/settings";
import { dailyLimitsForTier } from "@/lib/entitlements";
import { BRAND, normalizeSubscriptionTier, type SubscriptionTier } from "@/lib/constants";
import { userUsageToday, workspaceUsageToday, type UsageField } from "@/lib/automation/usage";
import { logAutomationEvent } from "@/lib/automation/usage";

/**
 * The gate every automated action passes through before it acts.
 *
 * `db/migrations/20260821000000_admin_flag.sql` names this module in a comment
 * ("Per-day automation caps consumed by lib/automation/safety.ts") — it just
 * never existed, so none of the safety the marketing pages promise was real.
 *
 * The order of the checks is deliberate and is part of the contract: the
 * cheapest and most absolute reasons come first, so a globally paused instance
 * does not run a workspace query per job, and a user who revoked consent is
 * never counted against a cap. The first failure wins and is the one reported.
 */

export type DenialReason =
  | "global_pause"
  | "user_paused"
  | "consent_missing"
  | "quiet_hours"
  | "daily_cap"
  | "automation_cap"
  | "error_pause";

export type SafetyDecision =
  | { allowed: true; dryRun: boolean }
  | { allowed: false; reason: DenialReason; detail: string; dryRun: boolean };

export type SafetyInput = {
  workspaceId: string | null;
  userId: string;
  /** Which counter this action spends. */
  field: UsageField;
  tier?: SubscriptionTier;
  /** Present for an action driven by a configured automation, absent for a plain scheduled post. */
  automationId?: string | null;
  /** Skips the quiet-hours check. A post the user scheduled for a specific time is not the automation acting on its own. */
  userScheduled?: boolean;
};

/** Default window when no automation overrides it: 9am–6pm in the user's own timezone, matching the copy on /trust. */
const DEFAULT_QUIET_START = 18;
const DEFAULT_QUIET_END = 9;

/** Auto-pause fires at this streak; see CONSECUTIVE_ERROR_LIMIT in usage.ts. */
const ERROR_PAUSE_LIMIT = 5;

type SafetyRow = {
  timezone: string | null;
  autopilot_paused: boolean;
  autopilot_pause_reason: string | null;
  autopilot_enabled: boolean;
  risk_acknowledged_at: string | null;
  consent_version: string | null;
  consecutive_error_count: number;
  daily_post_limit: number;
  daily_comment_limit: number;
  daily_invite_limit: number;
  daily_like_limit: number;
  automation_kind: string | null;
  automation_daily_cap: number | null;
  automation_quiet_start: number | null;
  automation_quiet_end: number | null;
  automation_dry_run: boolean | null;
  automation_active: boolean | null;
  tier: string | null;
};

/**
 * The hour of day where the user lives, not where the server runs.
 *
 * Uses Intl rather than offset arithmetic on purpose: hand-rolled offsets get
 * daylight saving wrong twice a year, and getting it wrong means posting at 3am
 * under somebody's name.
 */
export function hourInTimezone(date: Date, timeZone: string): number {
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).format(date);
    const hour = Number.parseInt(formatted, 10);
    return Number.isNaN(hour) ? date.getUTCHours() : hour % 24;
  } catch {
    // An invalid timezone string in the database should degrade to UTC rather
    // than throw and block the account entirely.
    return date.getUTCHours();
  }
}

/**
 * True when `hour` falls inside the quiet window.
 *
 * The window wraps midnight whenever start > end (22 → 6 is the normal case),
 * which is why this is not a simple range test.
 */
export function isWithinQuietHours(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/** Which per-user column on `users` caps this field, when one does. */
function perUserLimit(row: SafetyRow, field: UsageField): number | null {
  switch (field) {
    case "posts":
      return row.daily_post_limit;
    case "comments":
      return row.daily_comment_limit;
    case "invites":
      return row.daily_invite_limit;
    case "likes":
      return row.daily_like_limit;
    default:
      // dms and ai_calls have no per-user column; the tier cap governs them.
      return null;
  }
}

function tierLimitFor(tier: SubscriptionTier, field: UsageField): number | null {
  const limits = dailyLimitsForTier(tier);
  switch (field) {
    case "posts":
      return limits.posts;
    case "comments":
      return limits.comments;
    case "invites":
      return limits.invites;
    case "likes":
      return limits.likes;
    default:
      return null;
  }
}

/**
 * Decides whether one action may proceed.
 *
 * Returns a decision rather than throwing: a denial is an ordinary outcome the
 * caller records and defers, not an exception. Every denial is written to
 * `automation_log`, whose own comment says it exists so "nothing the product
 * does on a user's behalf is invisible to them" — a silent refusal would defeat
 * exactly that.
 */
export async function assertCanRun(input: SafetyInput): Promise<SafetyDecision> {
  // 1. Global pause. Cheapest and most absolute: honours both the env kill
  //    switch and the row the admin console writes.
  const globalPause = await getAutomationGlobalPause();
  if (globalPause.paused) {
    return deny(input, "global_pause", globalPause.reason || "Automation is globally paused", false);
  }

  if (!databaseConfigured()) {
    // Nothing to check against, and nothing can act either.
    return { allowed: true, dryRun: false };
  }

  const sql = db();
  const rows = (await sql`
    select
      u.timezone, u.autopilot_paused, u.autopilot_pause_reason, u.autopilot_enabled,
      u.risk_acknowledged_at, u.consent_version, u.consecutive_error_count,
      u.daily_post_limit, u.daily_comment_limit, u.daily_invite_limit, u.daily_like_limit,
      a.kind as automation_kind,
      a.daily_cap as automation_daily_cap,
      a.quiet_hours_start as automation_quiet_start,
      a.quiet_hours_end as automation_quiet_end,
      a.dry_run as automation_dry_run,
      a.is_active as automation_active,
      s.tier
    from users u
    left join automations a on a.id = ${input.automationId ?? null} and a.user_id = u.id
    left join lateral (
      select tier from subscriptions
      where user_id = u.id and status in ('active', 'trialing', 'past_due')
      order by created_at desc limit 1
    ) s on true
    where u.id = ${input.userId}
    limit 1
  `) as SafetyRow[];

  const row = rows[0];
  if (!row) {
    return deny(input, "user_paused", "No account record for this run", false);
  }

  // An automation row was asked for but is switched off. dry_run defaults true
  // in the schema, so an automation that has never been armed simulates rather
  // than acts — that default is a safety feature, not an oversight.
  const dryRun = row.automation_dry_run ?? false;

  // 2. Account-level pause, including one a previous failure streak set.
  if (row.autopilot_paused) {
    return deny(input, "user_paused", row.autopilot_pause_reason || "Automation is paused for this account", dryRun);
  }

  if (input.automationId && row.automation_active === false) {
    return deny(input, "user_paused", "This automation is switched off", dryRun);
  }

  // 3. Consent. Live execution requires an explicit opt-in, an acknowledged
  //    risk, and a consent version that still matches the current one — a
  //    changed policy has to be re-accepted rather than assumed.
  if (!row.autopilot_enabled || !row.risk_acknowledged_at) {
    return deny(input, "consent_missing", "Automation has not been enabled for this account", dryRun);
  }
  if (row.consent_version !== BRAND.consentVersion) {
    return deny(input, "consent_missing", "The current consent version has not been accepted", dryRun);
  }

  // 4. Error streak. Checked before caps so an account that is failing stops
  //    rather than burning its remaining quota on more failures.
  if (row.consecutive_error_count >= ERROR_PAUSE_LIMIT) {
    return deny(input, "error_pause", `Paused after ${row.consecutive_error_count} consecutive failures`, dryRun);
  }

  // 5. Quiet hours, in the user's timezone. Skipped when the user picked the
  //    time themselves — honouring an explicit 7am schedule is not the same as
  //    the automation deciding to act at 7am.
  if (!input.userScheduled) {
    const timezone = row.timezone || "UTC";
    const hour = hourInTimezone(new Date(), timezone);
    const start = row.automation_quiet_start ?? DEFAULT_QUIET_START;
    const end = row.automation_quiet_end ?? DEFAULT_QUIET_END;
    if (isWithinQuietHours(hour, start, end)) {
      return deny(input, "quiet_hours", `Quiet hours in ${timezone} (${start}:00–${end}:00)`, dryRun);
    }
  }

  // 6. Per-tier daily cap, counted across the whole workspace, and the tighter
  //    per-user column where one exists.
  const tier = input.tier ?? normalizeSubscriptionTier(row.tier);
  const tierCap = tierLimitFor(tier, input.field);

  if (tierCap !== null) {
    const used = input.workspaceId
      ? (await workspaceUsageToday(input.workspaceId))[input.field]
      : (await userUsageToday(input.userId))[input.field];
    if (used >= tierCap) {
      return deny(input, "daily_cap", `The ${tier} plan allows ${tierCap} ${input.field} per day`, dryRun);
    }
  }

  const userCap = perUserLimit(row, input.field);
  if (userCap !== null) {
    const usedByUser = (await userUsageToday(input.userId))[input.field];
    if (usedByUser >= userCap) {
      return deny(input, "daily_cap", `This account is limited to ${userCap} ${input.field} per day`, dryRun);
    }
  }

  // 7. Per-automation cap, on top of everything above.
  if (input.automationId && row.automation_daily_cap !== null) {
    const firedToday = await automationRunsToday(input.automationId);
    if (firedToday >= row.automation_daily_cap) {
      return deny(input, "automation_cap", `This automation is capped at ${row.automation_daily_cap} runs per day`, dryRun);
    }
  }

  return { allowed: true, dryRun };
}

/** Successful firings only — a blocked attempt must not consume the automation's own budget. */
async function automationRunsToday(automationId: string): Promise<number> {
  if (!databaseConfigured()) return 0;
  const sql = db();
  const rows = await sql`
    select count(*)::int as total
    from automation_log
    where automation_id = ${automationId}
      and outcome = 'success'
      and created_at >= date_trunc('day', now())
  `;
  return (rows[0]?.total as number) ?? 0;
}

function deny(input: SafetyInput, reason: DenialReason, detail: string, dryRun: boolean): SafetyDecision {
  void logAutomationEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    automationId: input.automationId ?? null,
    action: `safety.${input.field}`,
    outcome: "blocked",
    reason: `${reason}: ${detail}`,
    meta: { reason, field: input.field },
  });
  return { allowed: false, reason, detail, dryRun };
}

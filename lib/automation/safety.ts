import type { ApprovalMode, AutomationAction, SubscriptionTier } from "@/lib/constants";
import { PRICING } from "@/lib/constants";

export type SafetyReason =
  | "global_paused"
  | "user_paused"
  | "autopilot_disabled"
  | "requires_pro"
  | "missing_consent"
  | "first_week_review"
  | "outside_action_window"
  | "daily_limit_hit"
  | "consecutive_errors"
  | "checkpoint_detected"
  | "ready";

export type SafetyInput = {
  tier: SubscriptionTier;
  action: AutomationAction;
  approvalMode: ApprovalMode;
  autopilotEnabled: boolean;
  autopilotPaused: boolean;
  autopilotAcceptedAt: string | null;
  riskAcknowledgedAt: string | null;
  userCreatedAt: string;
  timezone: string;
  consecutiveErrorCount: number;
  usageToday: {
    posts: number;
    comments: number;
    invites: number;
    likes: number;
  };
  checkpointDetected?: boolean;
  approvedByUser?: boolean;
  now?: Date;
};

export type SafetyDecision = {
  allowed: boolean;
  requiresApproval: boolean;
  reason: SafetyReason;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  dailyLimit: number;
};

const DEFAULT_LIMITS = {
  posts: 0,
  comments: 0,
  invites: 0,
  likes: 0,
};

function tierLimits(tier: SubscriptionTier) {
  const plan = PRICING.find((price) => price.tier === tier);
  return plan?.limits ?? DEFAULT_LIMITS;
}

function limitForAction(tier: SubscriptionTier, action: AutomationAction): number {
  const limits = tierLimits(tier);
  if (action === "post") return limits.posts;
  if (action === "comment") return limits.comments;
  if (action === "invite") return limits.invites;
  if (action === "like") return limits.likes;
  return 10;
}

function usageForAction(input: SafetyInput): number {
  if (input.action === "post") return input.usageToday.posts;
  if (input.action === "comment") return input.usageToday.comments;
  if (input.action === "invite") return input.usageToday.invites;
  if (input.action === "like") return input.usageToday.likes;
  return 0;
}

function localHour(timezone: string, now: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  });
  return Number(formatter.format(now));
}

function daysSince(date: string, now: Date): number {
  const started = new Date(date).getTime();
  return Math.floor((now.getTime() - started) / 86_400_000);
}

export function randomizedDelaySeconds(): number {
  const min = 45;
  const max = 240;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function evaluateSafety(input: SafetyInput): SafetyDecision {
  const now = input.now ?? new Date();
  const dailyLimit = limitForAction(input.tier, input.action);
  const requiresApproval =
    input.approvalMode === "review" || daysSince(input.userCreatedAt, now) < 7 || input.action === "invite";

  const base = {
    allowed: false,
    requiresApproval,
    minDelaySeconds: 45,
    maxDelaySeconds: 240,
    dailyLimit,
  };

  if (process.env.AUTOMATION_GLOBAL_PAUSED === "true") {
    return { ...base, reason: "global_paused" };
  }
  if (input.autopilotPaused) {
    return { ...base, reason: "user_paused" };
  }
  if (!input.autopilotEnabled) {
    return { ...base, reason: "autopilot_disabled" };
  }
  if (input.tier !== "pro") {
    return { ...base, reason: "requires_pro" };
  }
  if (!input.autopilotAcceptedAt || !input.riskAcknowledgedAt) {
    return { ...base, reason: "missing_consent" };
  }
  if (input.approvalMode === "off") {
    return { ...base, reason: "user_paused" };
  }
  if (input.consecutiveErrorCount >= 3) {
    return { ...base, reason: "consecutive_errors" };
  }
  if (input.checkpointDetected) {
    return { ...base, reason: "checkpoint_detected" };
  }
  if (localHour(input.timezone, now) < 9 || localHour(input.timezone, now) >= 18) {
    return { ...base, reason: "outside_action_window" };
  }
  if (usageForAction(input) >= dailyLimit) {
    return { ...base, reason: "daily_limit_hit" };
  }
  if (requiresApproval && !input.approvedByUser) {
    return { ...base, allowed: false, reason: "first_week_review" };
  }

  return { ...base, allowed: true, reason: "ready" };
}

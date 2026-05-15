import type { ApprovalMode, AutomationAction, SubscriptionTier } from "@/lib/constants";

export type JsonObject = Record<string, unknown>;

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  linkedin_url: string | null;
  niche: string | null;
  icp_description: string | null;
  brand_voice: JsonObject | null;
  timezone: string;
  approval_mode: ApprovalMode;
  daily_post_limit: number;
  daily_comment_limit: number;
  daily_invite_limit: number;
  daily_like_limit: number;
  notification_email: boolean;
  notification_whatsapp: boolean;
  autopilot_enabled: boolean;
  autopilot_paused: boolean;
  autopilot_pause_reason: string | null;
  autopilot_accepted_at: string | null;
  risk_acknowledged_at: string | null;
  consent_version: string | null;
  consecutive_error_count: number;
  onboarded_at: string | null;
  created_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: "active" | "past_due" | "canceled" | "paused" | "trialing";
  current_period_end: string | null;
  trial_ends_at: string | null;
};

export type AppSession = {
  userId: string;
  email: string;
  profile: UserProfile;
  subscription: Subscription;
  subscriptionTier: SubscriptionTier;
};

export type QueueItemType = "post" | "comment" | "connection";

export type QueueItem = {
  id: string;
  type: QueueItemType;
  title: string;
  body: string;
  target: string | null;
  status: string;
  scheduledAt: string | null;
  score?: number;
};

export type WorkerAction = AutomationAction;

export type WorkerJob = {
  jobId: string;
  userId: string;
  action: WorkerAction;
  targetUrl?: string;
  payload: JsonObject;
  scheduledAt: string;
  safety: {
    minDelaySeconds: number;
    maxDelaySeconds: number;
    windowStartHour: number;
    windowEndHour: number;
    approvalMode: ApprovalMode;
    dailyLimit: number;
  };
};

export type AuditResult = {
  score: number;
  isEmptyProfile: boolean;
  summary: string;
  headlineSuggestion: string;
  aboutSuggestion: string;
  photoBannerChecklist: string[];
  keywordGaps: string[];
  contentPlan: string[];
  riskFlags: string[];
};

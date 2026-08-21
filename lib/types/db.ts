/**
 * Row types for the v2 schema.
 *
 * `lib/db.ts` returns `Record<string, any>[]`, so every query in the app used to
 * declare its own inline row type and cast to it. These are the shared shapes,
 * named after the tables they mirror in `db/migrations/20260820120000_v2_founder_os.sql`
 * so a column question has one obvious place to look.
 *
 * Timestamps are `string`, not `Date`: the Neon HTTP driver returns them
 * serialized, and every consumer either formats or re-parses them.
 */

export type Platform = "x" | "linkedin" | "bluesky";

export type Workspace = {
  id: string;
  clerk_org_id: string | null;
  name: string;
  slug: string | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SocialAccount = {
  id: string;
  workspace_id: string;
  user_id: string;
  platform: Platform;
  platform_user_id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  /** AES-256-GCM via lib/security/encryption.ts. Never leaves the server. */
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  token_expires_at: string | null;
  scopes: string[];
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
};

export type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed" | "cancelled";

export type PostCreatedVia = "manual" | "ai" | "voice_cloner" | "growth_plan" | "evergreen" | "relay";

/** Carries no content — the text lives entirely in PostVariant. */
export type Post = {
  id: string;
  workspace_id: string;
  user_id: string;
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  is_thread: boolean;
  recurring_rule: Record<string, unknown> | null;
  created_via: PostCreatedVia;
  source_post_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PostVariant = {
  id: string;
  post_id: string;
  social_account_id: string | null;
  platform: Platform;
  content: string;
  /** 0 is the parent post; 1..n are subsequent items in a thread. */
  thread_order: number;
  media_urls: string[];
  link_preview_enabled: boolean;
  first_comment: string | null;
  /** Set once the platform accepts the post. Its presence is what makes publishing idempotent. */
  platform_post_id: string | null;
  platform_post_url: string | null;
  published_at: string | null;
  error_message: string | null;
};

export type VoiceProfileSource = "preset" | "interview" | "import" | "hybrid";

export type VoiceProfile = {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  source: VoiceProfileSource;
  preset_key: string | null;
  /** Sliders, lexicon, taboo words, structure, exemplars, per-platform overrides. Owned by lib/voice. */
  profile: Record<string, unknown>;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AutomationKind =
  | "auto_dm"
  | "comment_capture"
  | "auto_plug"
  | "first_comment"
  | "evergreen"
  | "cross_post_relay"
  | "thread_drip"
  | "source_watcher"
  | "lead_followup";

export type Automation = {
  id: string;
  workspace_id: string;
  user_id: string;
  social_account_id: string | null;
  kind: AutomationKind;
  trigger: Record<string, unknown>;
  conditions: unknown[];
  action: Record<string, unknown>;
  daily_cap: number;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  is_active: boolean;
  /** Simulates every firing without making external calls. Defaults true. */
  dry_run: boolean;
  last_run_at: string | null;
  created_at: string;
};

export type AutomationOutcome = "success" | "failed" | "skipped" | "blocked";

export type AutomationLogEntry = {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  automation_id: string | null;
  post_id: string | null;
  action: string;
  outcome: AutomationOutcome;
  reason: string | null;
  recipient_handle: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export type Lead = {
  id: string;
  workspace_id: string;
  user_id: string;
  automation_id: string | null;
  platform: Platform;
  handle: string;
  display_name: string | null;
  email: string | null;
  source_post_id: string | null;
  keyword: string | null;
  delivered_at: string | null;
  unsubscribed_at: string | null;
  captured_at: string;
};

export type EvergreenItem = {
  id: string;
  workspace_id: string;
  user_id: string;
  post_id: string | null;
  content: string;
  platforms: Platform[];
  cooldown_days: number;
  last_used_at: string | null;
  use_count: number;
  is_active: boolean;
  created_at: string;
};

export type UserDailyUsage = {
  user_id: string;
  workspace_id: string | null;
  usage_date: string;
  posts: number;
  comments: number;
  dms: number;
  ai_calls: number;
  invites: number;
  likes: number;
};

export type AiGeneration = {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  post_id: string | null;
  provider: string;
  model: string;
  action_type: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: string;
  created_at: string;
};

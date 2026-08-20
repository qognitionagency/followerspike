-- FollowerSpike v2 schema: the three-platform founder OS.
--
-- Adds the tables the application already queries but which were never
-- committed as migrations (users, posts, user_daily_usage, system_settings,
-- automation_log), plus everything the v2 feature set needs: connected social
-- accounts, per-platform post variants, voice profiles, Spike Rank history,
-- automations, and captured leads.
--
-- Deliberately NOT recreated: comments, connections, and target_leaders. Those
-- belong to the retired LinkedIn browser-automation product; the code that
-- reads them is removed when the automation engine is rebuilt.

create extension if not exists pgcrypto;
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  -- Clerk owns identity. This is the join key back to the Clerk user
  -- ("user_..."); the uuid above stays the foreign key every other table uses.
  clerk_user_id text unique,
  email text,
  full_name text,
  timezone text not null default 'UTC',
  -- Kept from the previous product so existing server code keeps resolving.
  approval_mode text not null default 'review' check (approval_mode in ('review','auto','off')),
  autopilot_enabled boolean not null default false,
  autopilot_paused boolean not null default true,
  autopilot_pause_reason text,
  autopilot_accepted_at timestamptz,
  risk_acknowledged_at timestamptz,
  consent_version text,
  consecutive_error_count integer not null default 0,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Connected social accounts
-- ---------------------------------------------------------------------------

create table if not exists social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  platform text not null check (platform in ('x','linkedin','bluesky')),
  platform_user_id text not null,
  handle text not null,
  display_name text,
  avatar_url text,
  -- Encrypted at the application layer before they ever reach Postgres.
  access_token_enc text,
  refresh_token_enc text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  is_active boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, platform, platform_user_id)
);

create index if not exists social_accounts_user_idx on social_accounts (user_id, platform);

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','scheduled','publishing','published','failed','cancelled')),
  scheduled_at timestamptz,
  published_at timestamptz,
  is_thread boolean not null default false,
  -- {freq:'daily', time:'09:00', tz:'Asia/Kolkata'}
  recurring_rule jsonb,
  created_via text not null default 'manual' check (created_via in ('manual','ai','voice_cloner','growth_plan','evergreen','relay')),
  source_post_id uuid references posts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The scheduler only ever scans due, scheduled rows.
create index if not exists posts_due_idx on posts (scheduled_at) where status = 'scheduled';
create index if not exists posts_user_idx on posts (user_id, created_at desc);

create table if not exists post_variants (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  social_account_id uuid references social_accounts(id) on delete set null,
  platform text not null check (platform in ('x','linkedin','bluesky')),
  content text not null,
  -- 0 is the parent post; 1..n are subsequent items in a thread.
  thread_order integer not null default 0,
  media_urls text[] not null default '{}',
  link_preview_enabled boolean not null default true,
  first_comment text,
  platform_post_id text,
  platform_post_url text,
  published_at timestamptz,
  error_message text,
  unique (post_id, platform, thread_order)
);

create index if not exists post_variants_post_idx on post_variants (post_id, platform);

-- Approved posts eligible for automated recycling.
create table if not exists evergreen_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  post_id uuid references posts(id) on delete set null,
  content text not null,
  platforms text[] not null default '{}',
  cooldown_days integer not null default 30,
  last_used_at timestamptz,
  use_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Voice
-- ---------------------------------------------------------------------------

create table if not exists voice_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null default 'My voice',
  -- How this profile was created; "interview" is the cold-start path for
  -- founders with no posts to clone.
  source text not null check (source in ('preset','interview','import','hybrid')),
  preset_key text,
  -- Sliders, lexicon, taboo words, structure, grounding facts, exemplars,
  -- and per-platform overrides. Shape is owned by lib/voice.
  profile jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voice_profiles_user_idx on voice_profiles (user_id) where is_active;

-- Raw answers, kept so a profile can be recomputed when the synthesis prompt improves.
create table if not exists voice_interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  voice_profile_id uuid references voice_profiles(id) on delete set null,
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- The edit a user makes to a generated draft is the strongest voice signal
-- available, so every correction is retained to refine the profile.
create table if not exists voice_calibrations (
  id uuid primary key default gen_random_uuid(),
  voice_profile_id uuid not null references voice_profiles(id) on delete cascade,
  generated_text text not null,
  edited_text text,
  verdict text check (verdict in ('kept','edited','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists voice_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  voice_profile_id uuid references voice_profiles(id) on delete cascade,
  content text not null,
  embedding vector(1024),
  source text not null default 'imported' check (source in ('imported','generated')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Spike Rank
-- ---------------------------------------------------------------------------

create table if not exists profile_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  free_tool_lead_id uuid references free_tool_leads(id) on delete set null,
  platform text not null check (platform in ('x','linkedin','bluesky')),
  handle text not null,
  score integer not null check (score between 0 and 100),
  -- Per-pillar scores plus every check with its status, evidence, and fix.
  pillars jsonb not null default '[]'::jsonb,
  top_fixes jsonb not null default '[]'::jsonb,
  observed jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profile_scores_history_idx on profile_scores (user_id, platform, created_at desc);
create index if not exists profile_scores_handle_idx on profile_scores (platform, handle, created_at desc);

create table if not exists growth_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  profile_score_id uuid references profile_scores(id) on delete set null,
  platform text check (platform in ('x','linkedin','bluesky')),
  target_pillar text,
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  created_at timestamptz not null default now()
);

create table if not exists growth_plan_items (
  id uuid primary key default gen_random_uuid(),
  growth_plan_id uuid not null references growth_plans(id) on delete cascade,
  kind text not null check (kind in ('profile_fix','post_idea','cadence_target')),
  title text not null,
  body text,
  post_id uuid references posts(id) on delete set null,
  completed_at timestamptz,
  sort_order integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Automation and lead capture
-- ---------------------------------------------------------------------------

create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  social_account_id uuid references social_accounts(id) on delete cascade,
  kind text not null check (kind in (
    'auto_dm','comment_capture','auto_plug','first_comment',
    'evergreen','cross_post_relay','thread_drip','source_watcher','lead_followup'
  )),
  -- {keyword:'PLAYBOOK'} / {hours_after:2, min_impressions:500}
  trigger jsonb not null default '{}'::jsonb,
  conditions jsonb not null default '[]'::jsonb,
  -- {template:'...', link:'https://...'}
  action jsonb not null default '{}'::jsonb,
  daily_cap integer not null default 25,
  quiet_hours_start integer check (quiet_hours_start between 0 and 23),
  quiet_hours_end integer check (quiet_hours_end between 0 and 23),
  is_active boolean not null default false,
  -- Simulates every firing without making external calls.
  dry_run boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists automations_active_idx on automations (user_id) where is_active;

-- One row per firing, including the ones a cap or quiet-hour rule blocked, so
-- nothing the product does on a user's behalf is invisible to them.
create table if not exists automation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  automation_id uuid references automations(id) on delete set null,
  post_id uuid references posts(id) on delete set null,
  action text not null,
  outcome text not null check (outcome in ('success','failed','skipped','blocked')),
  reason text,
  recipient_handle text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists automation_log_user_idx on automation_log (user_id, created_at desc);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  automation_id uuid references automations(id) on delete set null,
  platform text not null check (platform in ('x','linkedin','bluesky')),
  handle text not null,
  display_name text,
  email text,
  source_post_id uuid references posts(id) on delete set null,
  keyword text,
  delivered_at timestamptz,
  unsubscribed_at timestamptz,
  captured_at timestamptz not null default now(),
  unique (user_id, platform, handle, automation_id)
);

create index if not exists leads_user_idx on leads (user_id, captured_at desc);

-- ---------------------------------------------------------------------------
-- Usage, cost, and admin
-- ---------------------------------------------------------------------------

create table if not exists user_daily_usage (
  user_id uuid not null references users(id) on delete cascade,
  usage_date date not null default current_date,
  posts integer not null default 0,
  comments integer not null default 0,
  dms integer not null default 0,
  ai_calls integer not null default 0,
  -- Retained so the existing safety governor keeps compiling; the actions they
  -- counted are no longer performed.
  invites integer not null default 0,
  likes integer not null default 0,
  primary key (user_id, usage_date)
);

create table if not exists ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  post_id uuid references posts(id) on delete set null,
  provider text not null,
  model text not null,
  action_type text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10,6) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ai_generations_cost_idx on ai_generations (created_at desc);

create table if not exists system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Authorization
--
-- No row level security. Neon exposes no PostgREST endpoint and no anon key, so
-- the application server holding DATABASE_URL is the only client that can reach
-- these tables. Every query is
-- therefore scoped by user in application code — see lib/session.ts, which
-- resolves the Clerk session to a users row before anything is read.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- User provisioning
--
-- Previously a trigger on auth.users. Clerk is the source of identity now, so
-- the users row is created on demand the first time a Clerk session is seen
-- (lib/session.ts) and kept in sync by the Clerk webhook.
-- ---------------------------------------------------------------------------

create index if not exists users_clerk_user_id_idx on users (clerk_user_id);

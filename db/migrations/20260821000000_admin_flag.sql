-- Restores the columns the application's UserProfile type expects.
--
-- The v2 migration rebuilt `users` around the three-platform product and dropped
-- the per-user profile and limit fields the app still reads and writes. They are
-- added back here rather than reshaping UserProfile and every page that consumes
-- it, which would be a product change rather than a database move.

-- The admin console gates on this.
alter table users add column if not exists is_admin boolean not null default false;
create index if not exists users_is_admin_idx on users (is_admin) where is_admin;

-- Profile and voice fields written by /app/voice.
alter table users add column if not exists linkedin_url text;
alter table users add column if not exists niche text;
alter table users add column if not exists icp_description text;
alter table users add column if not exists brand_voice jsonb;
alter table users add column if not exists onboarded_at timestamptz;

-- Per-day automation caps consumed by lib/automation/safety.ts. Defaults match
-- the free tier, so a brand new row is never more permissive than a free seat.
alter table users add column if not exists daily_post_limit integer not null default 1;
alter table users add column if not exists daily_comment_limit integer not null default 3;
alter table users add column if not exists daily_invite_limit integer not null default 0;
alter table users add column if not exists daily_like_limit integer not null default 0;

alter table users add column if not exists notification_email boolean not null default true;
alter table users add column if not exists notification_whatsapp boolean not null default false;

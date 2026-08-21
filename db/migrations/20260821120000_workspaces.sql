-- Workspaces: the ownership boundary for everything a customer creates.
--
-- Agency tier sells "15 connected accounts across client workspaces", a saved
-- voice per client, and a team approval workflow. All of that needs an owner
-- that is not a single user, and retrofitting an ownership key across sixteen
-- tables later is a migration nobody wants — so it lands before the features do.
--
-- Membership deliberately does NOT live here. Clerk Organizations owns orgs,
-- roles and invitations; `clerk_org_id` is the join key back, exactly as
-- `users.clerk_user_id` already joins the Clerk identity to the local row. The
-- uuid below stays the foreign key every other table uses.

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  -- Null until the workspace is backed by a Clerk organization. Every workspace
  -- created from here on has one; the backfilled personal workspaces below do
  -- not, and are claimed when their owner's org is created.
  clerk_org_id text unique,
  name text not null,
  slug text,
  -- The personal owner. Kept even once Clerk holds membership, because it is
  -- what resolves a default workspace for a solo founder who has never seen an
  -- organization switcher.
  owner_user_id uuid references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspaces_owner_idx on workspaces (owner_user_id);

-- ---------------------------------------------------------------------------
-- Backfill: one personal workspace per existing user.
-- ---------------------------------------------------------------------------
-- Runs before any column is made NOT NULL, so every existing row has somewhere
-- to point. Idempotent: re-running finds the workspace already there.

insert into workspaces (name, owner_user_id)
select
  coalesce(nullif(trim(u.full_name), ''), u.email, 'My workspace'),
  u.id
from users u
where not exists (
  select 1 from workspaces w where w.owner_user_id = u.id
);

-- ---------------------------------------------------------------------------
-- Ownership columns
-- ---------------------------------------------------------------------------
-- Every table below gains workspace_id, backfilled through the owning user.
-- The tables whose user_id is itself nullable (anonymous free-tool rank runs,
-- system-generated log rows) keep a nullable workspace_id — there is no
-- workspace to attribute those to.

alter table social_accounts add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
update social_accounts s set workspace_id = w.id
  from workspaces w where w.owner_user_id = s.user_id and s.workspace_id is null;
alter table social_accounts alter column workspace_id set not null;
create index if not exists social_accounts_workspace_idx on social_accounts (workspace_id, platform);

alter table posts add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
update posts p set workspace_id = w.id
  from workspaces w where w.owner_user_id = p.user_id and p.workspace_id is null;
alter table posts alter column workspace_id set not null;
create index if not exists posts_workspace_idx on posts (workspace_id, created_at desc);

alter table voice_profiles add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
update voice_profiles v set workspace_id = w.id
  from workspaces w where w.owner_user_id = v.user_id and v.workspace_id is null;
alter table voice_profiles alter column workspace_id set not null;
create index if not exists voice_profiles_workspace_idx on voice_profiles (workspace_id) where is_active;

alter table automations add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
update automations a set workspace_id = w.id
  from workspaces w where w.owner_user_id = a.user_id and a.workspace_id is null;
alter table automations alter column workspace_id set not null;
create index if not exists automations_workspace_idx on automations (workspace_id) where is_active;

alter table leads add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
update leads l set workspace_id = w.id
  from workspaces w where w.owner_user_id = l.user_id and l.workspace_id is null;
alter table leads alter column workspace_id set not null;
create index if not exists leads_workspace_idx on leads (workspace_id, captured_at desc);

alter table growth_plans add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
update growth_plans g set workspace_id = w.id
  from workspaces w where w.owner_user_id = g.user_id and g.workspace_id is null;
alter table growth_plans alter column workspace_id set not null;

alter table evergreen_items add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
update evergreen_items e set workspace_id = w.id
  from workspaces w where w.owner_user_id = e.user_id and e.workspace_id is null;
alter table evergreen_items alter column workspace_id set not null;
create index if not exists evergreen_items_workspace_idx on evergreen_items (workspace_id) where is_active;

-- Nullable: an anonymous free-tool run has a user_id of NULL and belongs to no
-- workspace. Those rows are the majority of this table today.
alter table profile_scores add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
update profile_scores p set workspace_id = w.id
  from workspaces w where w.owner_user_id = p.user_id and p.workspace_id is null;
create index if not exists profile_scores_workspace_idx on profile_scores (workspace_id, platform, created_at desc);

-- Nullable for the same reason: automation_log.user_id is nullable.
alter table automation_log add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
update automation_log a set workspace_id = w.id
  from workspaces w where w.owner_user_id = a.user_id and a.workspace_id is null;
create index if not exists automation_log_workspace_idx on automation_log (workspace_id, created_at desc);

-- Usage stays keyed by (user_id, usage_date): a workspace can have several
-- members, and each one's activity is counted against them individually. The
-- safety gate sums across the workspace when it enforces a per-tier cap, which
-- is what this index is for.
alter table user_daily_usage add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
update user_daily_usage u set workspace_id = w.id
  from workspaces w where w.owner_user_id = u.user_id and u.workspace_id is null;
create index if not exists user_daily_usage_workspace_idx on user_daily_usage (workspace_id, usage_date);

alter table ai_generations add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
update ai_generations g set workspace_id = w.id
  from workspaces w where w.owner_user_id = g.user_id and g.workspace_id is null;
-- Per-workspace cost rollups scanned the whole table without this.
create index if not exists ai_generations_workspace_idx on ai_generations (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Billing follows the workspace
-- ---------------------------------------------------------------------------
-- An Agency seat is bought by the workspace, not by the person who happened to
-- click subscribe.

alter table subscriptions add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
update subscriptions s set workspace_id = w.id
  from workspaces w where w.owner_user_id = s.user_id and s.workspace_id is null;
create index if not exists subscriptions_workspace_idx on subscriptions (workspace_id, created_at desc);

-- subscriptions.user_id was declared `uuid not null` with no foreign key, so it
-- never cascaded on account deletion despite the settings page claiming every
-- user-owned table does. Added NOT VALID: the constraint governs new rows
-- immediately without failing this migration on any legacy orphan, and can be
-- validated separately once those are cleaned up.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_user_id_fkey'
  ) then
    alter table subscriptions
      add constraint subscriptions_user_id_fkey
      foreign key (user_id) references users(id) on delete cascade not valid;
  end if;
end $$;

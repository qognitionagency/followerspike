-- A ledger of applied migrations.
--
-- This table exists because its absence caused a production outage. Migrations
-- are applied by hand (`psql "$DATABASE_URL" -f <file>`), and with no record of
-- which files had run, 20260821120000_workspaces.sql and 20260821130000_jobs.sql
-- were committed, deployed, and never applied. Every signed-in page queries
-- `workspace_id`, so the whole /app half failed against a database that had no
-- such column — and nothing anywhere could report the mismatch, because there
-- was nothing to compare the code against.
--
-- `scripts/migrate.ts` is the writer. Applying a file by hand still works and is
-- still supported; it just will not be recorded, which is why the script is now
-- the documented path.

create table if not exists schema_migrations (
  -- The migration filename without its .sql suffix, which is also the sort key:
  -- the leading timestamp is what defines apply order.
  version text primary key,
  applied_at timestamptz not null default now(),
  -- Milliseconds the file took. A migration that suddenly takes far longer than
  -- it did in staging is worth seeing before it locks a table in production.
  duration_ms integer
);

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------
-- Everything up to and including this file is already applied by the time this
-- runs, so they are recorded as such rather than being re-run by the first
-- invocation of the migrate script. applied_at is deliberately left as now():
-- the real application times were not recorded anywhere, and inventing them
-- would be worse than an honest "known to be applied by this point".

insert into schema_migrations (version)
values
  ('20260515172000_integrations_foundation'),
  ('20260516043000_free_tool_leads'),
  ('20260820120000_v2_founder_os'),
  ('20260821000000_admin_flag'),
  ('20260821010000_seed_admin'),
  ('20260821120000_workspaces'),
  ('20260821130000_jobs'),
  ('20260821140000_voice_evergreen_growth'),
  ('20260821150000_schema_migrations')
on conflict (version) do nothing;

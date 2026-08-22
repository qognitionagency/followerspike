-- Rate limiting and error recording, both in Postgres.
--
-- Neither existed. `/api/free-tools/[slug]` is unauthenticated, runs an AI
-- generation on every call and writes a lead row from an unverified email
-- address, so a single script could burn the AI budget and fill the leads table
-- unattended. And when anything failed anywhere, the handler returned a generic
-- 502 and the detail was gone: there was no error tracking of any kind, so the
-- only evidence a request had failed was the status code the caller saw.
--
-- Postgres rather than Redis or a hosted tracker because DATABASE_URL is the
-- one thing production actually has configured, and because the job queue and
-- automation_log already work this way. A counter row per window is cheap, and
-- both tables are self-pruning.

-- ---------------------------------------------------------------------------
-- Rate limits
-- ---------------------------------------------------------------------------
-- One row per (bucket, window). The window start is truncated by the caller so
-- that concurrent requests in the same window collide on the primary key and
-- increment the same counter, which is what makes the limit correct under
-- concurrency without a transaction.
create table if not exists rate_limits (
  -- Identifies who is being limited and for what: "free-tool:spike-rank-x:1.2.3.4".
  -- The scope is part of the key so one tool's limit cannot spend another's.
  bucket text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (bucket, window_start)
);

-- Prunes expired windows. Every lookup filters on window_start, and the sweeper
-- deletes by it.
create index if not exists rate_limits_window_start_idx on rate_limits (window_start);

-- ---------------------------------------------------------------------------
-- Error log
-- ---------------------------------------------------------------------------
create table if not exists error_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  -- Where it happened: "api/ai/post", "job/publish_variant". Coarse on purpose;
  -- this is what you group by when asking what is failing most.
  source text not null,
  -- error.name, or a caller-supplied label for a handled failure.
  kind text not null,
  message text not null,
  stack text,
  -- Nullable because the most valuable errors are often the ones that happened
  -- before a session could be resolved.
  user_id uuid references users (id) on delete set null,
  workspace_id uuid references workspaces (id) on delete set null,
  request_path text,
  -- Anything else worth keeping: status codes, job ids, the platform involved.
  -- Never the request body, which is where the secrets are.
  context jsonb not null default '{}'::jsonb
);

create index if not exists error_log_occurred_at_idx on error_log (occurred_at desc);
create index if not exists error_log_source_idx on error_log (source, occurred_at desc);

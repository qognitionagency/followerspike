-- The job queue: one durable row per unit of background work.
--
-- Everything the automation engine owes a user happens away from a request —
-- publishing a scheduled post, firing an auto-plug two hours later, refilling
-- evergreen, polling for leads. None of that can live in a Vercel function
-- invocation triggered by a page view, and none of it may be lost if a runner
-- dies mid-flight. So the work is written down here first and executed second.
--
-- Postgres is the queue rather than a dedicated broker because Neon is already
-- the only datastore and `for update skip locked` gives exactly-one-claimer
-- semantics without one. QStash is the *timer and the fan-out*, not the
-- store: it wakes the dispatcher and carries one signed message per claimed
-- job, so a slow batch cannot walk into the function timeout. If a QStash
-- delivery is dropped the row is still here and the lease reaper re-queues it.

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  -- Nullable: system-level work (rank refreshes for anonymous free-tool runs,
  -- housekeeping) belongs to no customer, the same reason automation_log and
  -- profile_scores carry a nullable workspace_id.
  workspace_id uuid references workspaces(id) on delete cascade,
  -- Deliberately not a check constraint. The handler registry in
  -- lib/jobs/handlers.ts is the source of truth for which kinds exist, and it
  -- grows every wave; a constraint here would mean a migration per handler and
  -- a window where deploy order decides whether enqueueing works.
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  run_at timestamptz not null default now(),
  -- pending  -> claimable now (or once run_at arrives)
  -- claimed  -> a runner holds the lease below and is working on it
  -- succeeded-> handler returned
  -- failed   -> handler reported a failure that retrying cannot fix
  -- dead     -> retries exhausted; needs a human, never runs again
  status text not null default 'pending' check (status in ('pending','claimed','succeeded','failed','dead')),
  -- Incremented at claim time, not at failure time: a runner that is OOM-killed
  -- before it can report anything still burns an attempt, so a job that
  -- reliably kills its runner cannot loop forever.
  attempts int not null default 0,
  max_attempts int not null default 5,
  last_error text,
  -- How long the claiming runner has to finish. Past this the row is presumed
  -- orphaned and goes back to pending — see reapExpiredLeases().
  lease_expires_at timestamptz,
  -- Caller-supplied dedupe key, e.g. 'publish_variant:<variant_id>'. The unique
  -- constraint plus `on conflict do nothing` is what makes enqueueing from a
  -- retried webhook, a redelivered QStash message, or two racing schedulers
  -- safe. Null for work that is genuinely allowed to repeat.
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The claim query is `status = 'pending' and run_at <= now() order by run_at`,
-- run every tick forever. Partial on status so the index holds only the small
-- live head of the table and not the succeeded history behind it.
create index if not exists jobs_due_idx on jobs (run_at) where status = 'pending';

-- Same reasoning for the reaper, which scans only claimed rows whose lease has
-- lapsed. Without this it degrades into a seq scan over the whole table.
create index if not exists jobs_lease_idx on jobs (lease_expires_at) where status = 'claimed';

-- Both for "what has this workspace got queued" in the activity views and so
-- that deleting a workspace does not seq-scan this table once per cascade.
create index if not exists jobs_workspace_idx on jobs (workspace_id, created_at desc);

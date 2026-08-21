-- Indexes for the three v2 feature areas that had schema but no code.
--
-- No new tables: voice_interviews, voice_calibrations, voice_embeddings,
-- evergreen_items and growth_plan_items were all created by the v2 migration
-- and left empty. What they never had was the indexes their access patterns
-- need, because there were no access patterns yet. There are now.

-- ---------------------------------------------------------------------------
-- Voice
-- ---------------------------------------------------------------------------

-- Similarity search over exemplars (lib/voice/embeddings.ts).
--
-- HNSW rather than IVFFlat: IVFFlat has to be built against existing rows to
-- choose its lists, and every one of these tables is empty today, so an IVFFlat
-- index created now would be tuned for zero rows. HNSW needs no training set
-- and degrades far more gracefully as the table grows from nothing.
--
-- vector_cosine_ops must match the `<=>` operator the query uses; an index
-- built for a different distance is silently ignored by the planner.
create index if not exists voice_embeddings_vector_idx
  on voice_embeddings using hnsw (embedding vector_cosine_ops);

-- The similarity query filters by user before it ranks, so the filter needs its
-- own index — otherwise every search scans one user's rows out of everybody's.
create index if not exists voice_embeddings_user_idx
  on voice_embeddings (user_id, voice_profile_id);

-- latestInterview() orders unfinished-first, then newest.
create index if not exists voice_interviews_user_idx
  on voice_interviews (user_id, created_at desc);

-- calibrationSummary() and recentEdits() both filter on the profile.
create index if not exists voice_calibrations_profile_idx
  on voice_calibrations (voice_profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Evergreen
-- ---------------------------------------------------------------------------

-- The refill job asks for the least-recently-used active item whose cooldown
-- has elapsed. Ordering by last_used_at with nulls first is what makes a
-- never-used item win, so the index carries that ordering rather than making
-- the planner sort the whole active set on every tick.
create index if not exists evergreen_items_due_idx
  on evergreen_items (workspace_id, last_used_at asc nulls first)
  where is_active;

-- ---------------------------------------------------------------------------
-- Growth plans
-- ---------------------------------------------------------------------------

-- Items are always read as a whole plan in display order.
create index if not exists growth_plan_items_plan_idx
  on growth_plan_items (growth_plan_id, sort_order asc);

-- The dashboard asks for a workspace's active plan.
create index if not exists growth_plans_workspace_idx
  on growth_plans (workspace_id, status, created_at desc);

-- Remove the three automation kinds that have no handler.
--
-- `thread_drip`, `source_watcher` and `lead_followup` have been valid values of
-- `automations.kind` since the v2 schema landed, with nothing behind any of
-- them. Nothing dispatches them, `lib/jobs/handlers.ts` has no branch for them,
-- and `IMPLEMENTED_AUTOMATION_KINDS` exists specifically to keep them out of
-- the UI, with an e2e test holding that line.
--
-- That is three separate mechanisms maintaining the fiction that a column can
-- hold values the system cannot act on. A kind that reaches the database but
-- never reaches a handler is a row that looks configured and does nothing,
-- which is worse than a column that refuses it.
--
-- These are removed rather than built because there is no specification for any
-- of them. When one is genuinely wanted, the migration that adds the kind back
-- should be the same change that adds its handler, so the two cannot separate
-- again. This follows 20260822140000_drop_auto_dm_kind.sql, which removed
-- `auto_dm` for a different reason: that one contradicted a published promise,
-- these three are simply vapour.
--
-- Safe to run: `automations` was verified empty before this was written. The
-- delete is belt and braces, and is correct regardless, since a row of any of
-- these kinds could never have executed.

delete from automations where kind in ('thread_drip', 'source_watcher', 'lead_followup');

alter table automations drop constraint if exists automations_kind_check;

alter table automations add constraint automations_kind_check check (kind in (
  'comment_capture','auto_plug','first_comment','evergreen','cross_post_relay'
));

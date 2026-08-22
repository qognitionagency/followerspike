-- Remove `auto_dm` as a possible automation kind.
--
-- The product commits publicly, on /trust, /security and the pricing page, to
-- never sending direct messages: no adapter has a DM method, keyword capture
-- delivers by email to an address the recipient types into their own reply, and
-- TRUST_DISCLAIMER says so in as many words. Leaving `auto_dm` in the check
-- constraint left a schema-level contradiction of a published promise, and a
-- ready-made slot for someone to later build the one thing the trust pages say
-- does not exist.
--
-- `thread_drip`, `source_watcher` and `lead_followup` stay. They are unbuilt but
-- they are consistent with what the product claims to be, and they remain gated
-- out of the UI by IMPLEMENTED_AUTOMATION_KINDS with an e2e test holding that
-- line.
--
-- Safe to run: `automations` was verified empty before this was written, so no
-- row can violate the narrowed constraint. The delete below is belt and braces
-- for any environment where that is not true, and it is the correct action
-- either way, since an auto_dm automation could never have executed.

delete from automations where kind = 'auto_dm';

alter table automations drop constraint if exists automations_kind_check;

alter table automations add constraint automations_kind_check check (kind in (
  'comment_capture','auto_plug','first_comment',
  'evergreen','cross_post_relay','thread_drip','source_watcher','lead_followup'
));

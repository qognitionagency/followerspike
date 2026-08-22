import { test, expect } from "@playwright/test";
import { extractEmail, mentionsKeyword } from "../lib/jobs/leads";
import {
  autoPlugConfig,
  commentCaptureConfig,
  crossPostRelayConfig,
  evergreenConfig,
  isImplementedKind,
  unmeasurableTrigger,
  PLUG_DELAY_HOURS,
} from "../lib/automations/store";
import { JOB_KINDS, getHandler } from "../lib/jobs/handlers";
import type { Automation } from "../lib/types/db";

/**
 * The decisions an automation makes before it acts.
 *
 * Everything pinned here is a decision that reaches a stranger or publishes
 * under a user's name, and every one of them fails silently in production if it
 * is wrong: a keyword matched too loosely emails somebody who never asked, a
 * config parsed too permissively fires a plug with no text, and a job kind with
 * no handler dies rather than running.
 *
 * No database and no browser, so these run in the signed-out project.
 */

/** A row shaped like `automations`, with only the fields the parsers read filled in. */
function automation(overrides: Partial<Automation>): Automation {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    workspace_id: "00000000-0000-0000-0000-000000000000",
    user_id: "00000000-0000-0000-0000-000000000000",
    social_account_id: null,
    kind: "auto_plug",
    trigger: {},
    conditions: [],
    action: {},
    daily_cap: 25,
    quiet_hours_start: null,
    quiet_hours_end: null,
    is_active: true,
    dry_run: true,
    last_run_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

test.describe("every job kind runs", () => {
  test("no registered kind is left without a handler", () => {
    // The registry used to carry six null slots, three of which the Pro plan
    // named by feature. A null handler is not an unimplemented feature that
    // waits — `runJob` parks the job as a permanent failure.
    for (const kind of JOB_KINDS) {
      expect(getHandler(kind), `${kind} has no handler`).toBeTruthy();
    }
  });

  test("an unknown kind still resolves to nothing", () => {
    expect(getHandler("not_a_real_kind")).toBeNull();
  });
});

test.describe("keyword matching", () => {
  test("matches the word on its own boundaries", () => {
    expect(mentionsKeyword("PLAYBOOK please", "PLAYBOOK")).toBe(true);
    expect(mentionsKeyword("playbook please", "PLAYBOOK")).toBe(true);
    expect(mentionsKeyword("send me the PLAYBOOK!", "PLAYBOOK")).toBe(true);
    expect(mentionsKeyword("PLAYBOOK", "PLAYBOOK")).toBe(true);
    expect(mentionsKeyword("(playbook)", "PLAYBOOK")).toBe(true);
  });

  test("does not fire on a word that merely contains the keyword", () => {
    // The failure this prevents: a keyword of PLAY emailing every reply that
    // says "player", "playbook" or "display".
    expect(mentionsKeyword("great player", "PLAY")).toBe(false);
    expect(mentionsKeyword("displayed nicely", "PLAY")).toBe(false);
    expect(mentionsKeyword("playbooks", "PLAYBOOK")).toBe(false);
  });

  test("treats a keyword with regex characters as literal text", () => {
    // A keyword is user input. Unescaped, "c++" or "." would compile into a
    // pattern that matches almost anything.
    expect(mentionsKeyword("I want C++ notes", "C++")).toBe(true);
    expect(mentionsKeyword("anything at all", ".")).toBe(false);
    expect(mentionsKeyword("send it", "(a|b)")).toBe(false);
  });

  test("handles accented and non-latin replies without splitting words", () => {
    expect(mentionsKeyword("guía por favor", "guía")).toBe(true);
    expect(mentionsKeyword("guíame", "guía")).toBe(false);
  });
});

test.describe("email extraction", () => {
  test("finds an address in an ordinary reply", () => {
    expect(extractEmail("PLAYBOOK me@example.com thanks")).toBe("me@example.com");
    expect(extractEmail("PLAYBOOK First.Last+tag@sub.example.co.uk")).toBe("first.last+tag@sub.example.co.uk");
  });

  test("returns null when there is nothing to deliver to", () => {
    expect(extractEmail("PLAYBOOK please")).toBeNull();
    expect(extractEmail("find me at example.com")).toBeNull();
    expect(extractEmail("@handle mentioned me")).toBeNull();
  });
});

test.describe("config parsing", () => {
  test("a plug with no text cannot be configured into firing", () => {
    expect(autoPlugConfig(automation({ action: {} }))).toBeNull();
    expect(autoPlugConfig(automation({ action: { template: "   " } }))).toBeNull();
    expect(autoPlugConfig(automation({ action: { template: "read more" } }))?.template).toBe("read more");
  });

  test("an out-of-range delay is clamped rather than obeyed", () => {
    // Stored jsonb is not validated by the database, so a row that drifted must
    // still produce a sane delay instead of a plug 400 hours later.
    expect(autoPlugConfig(automation({ trigger: { hours_after: 9999 }, action: { template: "x" } }))?.hoursAfter).toBe(
      PLUG_DELAY_HOURS.max
    );
    expect(autoPlugConfig(automation({ trigger: { hours_after: -5 }, action: { template: "x" } }))?.hoursAfter).toBe(
      PLUG_DELAY_HOURS.min
    );
    expect(autoPlugConfig(automation({ trigger: { hours_after: "soon" }, action: { template: "x" } }))?.hoursAfter).toBe(
      PLUG_DELAY_HOURS.default
    );
  });

  test("a relay with no valid platform is not configured", () => {
    expect(crossPostRelayConfig(automation({ action: { platforms: [] } }))).toBeNull();
    expect(crossPostRelayConfig(automation({ action: { platforms: ["mastodon"] } }))).toBeNull();
    expect(crossPostRelayConfig(automation({ action: { platforms: ["x", "nope", "bluesky"] } }))?.platforms).toEqual([
      "x",
      "bluesky",
    ]);
  });

  test("capture needs both a keyword and something to send", () => {
    expect(commentCaptureConfig(automation({ trigger: { keyword: "PLAYBOOK" }, action: {} }))).toBeNull();
    expect(commentCaptureConfig(automation({ trigger: {}, action: { body: "here it is" } }))).toBeNull();

    const config = commentCaptureConfig(
      automation({ trigger: { keyword: "PLAYBOOK" }, action: { body: "here it is" } })
    );
    expect(config?.keyword).toBe("PLAYBOOK");
    // A subject is defaulted rather than required — an email with no subject is
    // worse than one with a plain one.
    expect(config?.subject).toBeTruthy();
  });

  test("an evergreen cadence always yields a usable interval", () => {
    expect(evergreenConfig(automation({ trigger: {} })).everyDays).toBeGreaterThan(0);
    expect(evergreenConfig(automation({ trigger: { every_days: 0 } })).everyDays).toBeGreaterThan(0);
  });
});

test.describe("triggers we cannot measure", () => {
  test("names a reach threshold rather than ignoring it", () => {
    // No adapter exposes post metrics. Firing anyway would ignore a condition
    // the user set, and treating it as met would be a guess made under their
    // name — so the handler refuses and this is what tells it to.
    expect(unmeasurableTrigger(automation({ trigger: { min_impressions: 500 } }))).toBe("min_impressions");
    expect(unmeasurableTrigger(automation({ trigger: { min_likes: 10 } }))).toBe("min_likes");
    expect(unmeasurableTrigger(automation({ trigger: { hours_after: 4 } }))).toBeNull();
    expect(unmeasurableTrigger(automation({ trigger: {} }))).toBeNull();
  });
});

test.describe("what the UI may offer", () => {
  test("only kinds with a handler are offerable", () => {
    // `automations.kind` allows eight values; three of them have no handler and
    // must not appear in the UI as something a user can switch on.
    expect(isImplementedKind("auto_plug")).toBe(true);
    expect(isImplementedKind("comment_capture")).toBe(true);
    expect(isImplementedKind("thread_drip")).toBe(false);
    expect(isImplementedKind("source_watcher")).toBe(false);
    expect(isImplementedKind("lead_followup")).toBe(false);

    // auto_dm is not merely unimplemented, it was removed from the schema in
    // 20260822140000_drop_auto_dm_kind.sql. The product promises on /trust and
    // /pricing that it never sends direct messages, and no adapter has a DM
    // method; keeping the kind offerable would have contradicted that.
    expect(isImplementedKind("auto_dm")).toBe(false);
  });
});

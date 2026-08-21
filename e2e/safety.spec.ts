import { test, expect } from "@playwright/test";
import { hourInTimezone, isWithinQuietHours } from "../lib/automation/safety";

/**
 * The safety gate's two pure decisions, tested directly.
 *
 * These are the parts most likely to be quietly wrong: a quiet window that
 * wraps midnight is not a range test, and an hour computed in the server's
 * timezone rather than the user's means posting at 3am under their name. Both
 * fail silently in production if they are wrong, which is why they are worth
 * pinning here rather than trusting to review.
 *
 * No database and no server needed, so these run regardless of environment.
 */

test.describe("quiet hours", () => {
  test("a window inside one day excludes its end hour", () => {
    // 9:00–18:00 quiet means 9 is quiet and 18 is not — the end is exclusive,
    // or an 18:00 schedule would never fire.
    expect(isWithinQuietHours(9, 9, 18)).toBe(true);
    expect(isWithinQuietHours(17, 9, 18)).toBe(true);
    expect(isWithinQuietHours(18, 9, 18)).toBe(false);
    expect(isWithinQuietHours(8, 9, 18)).toBe(false);
  });

  test("a window that wraps midnight covers both sides of it", () => {
    // 22:00–06:00 is the normal overnight case, and the one a naive
    // start <= hour < end test gets exactly backwards.
    expect(isWithinQuietHours(23, 22, 6)).toBe(true);
    expect(isWithinQuietHours(0, 22, 6)).toBe(true);
    expect(isWithinQuietHours(5, 22, 6)).toBe(true);
    expect(isWithinQuietHours(6, 22, 6)).toBe(false);
    expect(isWithinQuietHours(12, 22, 6)).toBe(false);
  });

  test("an empty window is never quiet", () => {
    // Equal bounds mean "no quiet hours", not "quiet all day" — the opposite
    // reading would silently freeze an account.
    expect(isWithinQuietHours(0, 9, 9)).toBe(false);
    expect(isWithinQuietHours(9, 9, 9)).toBe(false);
  });
});

test.describe("hourInTimezone", () => {
  test("reads the hour where the user is, not where the server is", () => {
    // 2026-08-21T02:30:00Z is the previous evening in New York and mid-morning
    // in Kolkata. A server-local reading would call all three the same hour.
    const instant = new Date("2026-08-21T02:30:00Z");
    expect(hourInTimezone(instant, "UTC")).toBe(2);
    expect(hourInTimezone(instant, "America/New_York")).toBe(22);
    expect(hourInTimezone(instant, "Asia/Kolkata")).toBe(8);
  });

  test("handles midnight as 0 rather than 24", () => {
    // Intl's h23 vs h24 distinction: formatted as "24" this would fall outside
    // every window and quietly disable the check for one hour a day.
    expect(hourInTimezone(new Date("2026-08-21T00:15:00Z"), "UTC")).toBe(0);
  });

  test("falls back to UTC for a timezone the database should not have held", () => {
    // A bad string must degrade, not throw — throwing here would block every
    // action on the account.
    expect(hourInTimezone(new Date("2026-08-21T02:30:00Z"), "Not/AZone")).toBe(2);
  });
});

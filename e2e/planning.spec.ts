import { test, expect } from "@playwright/test";
import { normalizeCooldown } from "../lib/evergreen/store";
import { planProgress, type GrowthPlanWithItems, type GrowthPlanItem } from "../lib/growth/plan";

/**
 * Evergreen and growth-plan arithmetic.
 *
 * Both are small, and both are the kind of small that is wrong in production for
 * months: a cooldown that rounds to zero republishes the same post daily under
 * someone's name, and a progress ratio that divides by zero renders NaN% on an
 * empty plan.
 */

test.describe("evergreen cooldown", () => {
  test("a missing or nonsense cooldown falls back to the default", () => {
    expect(normalizeCooldown(undefined)).toBe(30);
    expect(normalizeCooldown(Number.NaN)).toBe(30);
    expect(normalizeCooldown(0)).toBe(30);
  });

  test("a cooldown below the floor is raised, not accepted", () => {
    // Below a week a "recycled" post is just a repeat, and readers notice.
    expect(normalizeCooldown(1)).toBe(7);
    expect(normalizeCooldown(-5)).toBe(7);
    expect(normalizeCooldown(7)).toBe(7);
  });

  test("a cooldown is capped and truncated to whole days", () => {
    expect(normalizeCooldown(10_000)).toBe(365);
    expect(normalizeCooldown(30.9)).toBe(30);
  });
});

function itemAt(index: number, completed: boolean): GrowthPlanItem {
  return {
    id: `item-${index}`,
    growth_plan_id: "plan",
    kind: "profile_fix",
    title: `Fix ${index}`,
    body: null,
    post_id: null,
    completed_at: completed ? new Date().toISOString() : null,
    sort_order: index,
  };
}

function planWith(items: GrowthPlanItem[]): GrowthPlanWithItems {
  return {
    id: "plan",
    workspace_id: "workspace",
    user_id: "user",
    profile_score_id: null,
    platform: "bluesky",
    target_pillar: "cadence",
    status: "active",
    created_at: new Date().toISOString(),
    items,
  };
}

test.describe("growth plan progress", () => {
  test("an empty plan is 0%, not NaN", () => {
    const progress = planProgress(planWith([]));
    expect(progress).toEqual({ total: 0, done: 0, ratio: 0 });
    expect(Number.isNaN(progress.ratio)).toBe(false);
  });

  test("progress counts completed items", () => {
    const progress = planProgress(planWith([itemAt(0, true), itemAt(1, false), itemAt(2, true), itemAt(3, false)]));
    expect(progress.total).toBe(4);
    expect(progress.done).toBe(2);
    expect(progress.ratio).toBe(0.5);
  });

  test("a fully completed plan reaches exactly 1", () => {
    // Rendered as a width percentage, so anything over 1 overflows the bar.
    const progress = planProgress(planWith([itemAt(0, true), itemAt(1, true)]));
    expect(progress.ratio).toBe(1);
  });
});

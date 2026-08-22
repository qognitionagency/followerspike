import { test, expect } from "@playwright/test";

/**
 * The free tools are the live lead funnel and the only pages that write to Neon
 * without a session, so they get the closest look.
 */
test("Spike Rank for Bluesky returns a real score and persists it", async ({ request }) => {
  const res = await request.post("/api/free-tools/spike-rank-bluesky", {
    data: { primaryText: "bsky.app" },
  });

  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.score).toBeGreaterThan(0);
  expect(body.score).toBeLessThanOrEqual(100);
  expect(body.sections?.length).toBeGreaterThan(0);
  // Written to Neon; absent only when DATABASE_URL is unset.
  expect(body.snapshotId, "snapshot should be recorded in Neon").toBeTruthy();
});

test("Spike Rank rejects a handle that does not exist", async ({ request }) => {
  const res = await request.post("/api/free-tools/spike-rank-bluesky", {
    data: { primaryText: "definitely-not-a-real-handle-99887.bsky.social" },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.title).toMatch(/could not find/i);
});

/**
 * Regression cover for a tool that was sold but never ran.
 *
 * `spike-rank-x` had a slug, a page, and a nav entry badged "New", but
 * `runFreeTool` had no branch for it, so every request fell through to the
 * generic positioning writeup: a 200 with prose that had never looked at the
 * profile and no score at all. Asserting on `score` is what distinguishes a
 * real result from that fallback.
 */
test("Spike Rank for X scores a pasted profile rather than falling through", async ({ request }) => {
  const profile = [
    "Jane Doe",
    "@janedoe",
    "Building Roammate, helping solo founders turn replies into subscribers. $8k MRR, shipping weekly. roammate.dev",
    "Pinned",
    "12.4K Followers",
    "310 Following",
  ].join("\n");

  const res = await request.post("/api/free-tools/spike-rank-x", { data: { primaryText: profile } });

  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.score, "a real score, not the generic fallback").toBeGreaterThan(0);
  expect(body.score).toBeLessThanOrEqual(100);
  expect(body.sections?.length).toBeGreaterThan(0);
  expect(body.snapshotId, "snapshot should be recorded in Neon").toBeTruthy();
});

test("Spike Rank for X scores a thin profile lower than a complete one", async ({ request }) => {
  const thin = ["Jane Doe", "@janedoe", "1,204 Followers", "310 Following"].join("\n") + "\n".padEnd(20, " ");
  const complete = [
    "Jane Doe",
    "@janedoe",
    "Building Roammate, helping solo founders turn replies into subscribers. $8k MRR, shipping weekly. roammate.dev",
    "Pinned",
    "12.4K Followers",
  ].join("\n");

  const [thinRes, completeRes] = await Promise.all([
    request.post("/api/free-tools/spike-rank-x", { data: { primaryText: thin } }),
    request.post("/api/free-tools/spike-rank-x", { data: { primaryText: complete } }),
  ]);

  const thinBody = await thinRes.json();
  const completeBody = await completeRes.json();
  expect(thinBody.score).toBeLessThan(completeBody.score);
});

test("Spike Rank for X rejects a bare handle with a message, not a fake score", async ({ request }) => {
  // The route used to accept a handle, which gave the scorer nothing to score.
  const res = await request.post("/api/free-tools/spike-rank-x", {
    data: { primaryText: "@janedoe" },
    failOnStatusCode: false,
  });
  expect(res.status()).toBe(400);
});

test("free tool validates bad input instead of 500ing", async ({ request }) => {
  const res = await request.post("/api/free-tools/spike-rank-bluesky", {
    data: { primaryText: "" },
    failOnStatusCode: false,
  });
  expect(res.status()).toBe(400);
});

test("unknown free tool 404s", async ({ request }) => {
  const res = await request.post("/api/free-tools/not-a-tool", { data: { primaryText: "x" }, failOnStatusCode: false });
  expect(res.status()).toBe(404);
});

test("free tool form submits from the browser and shows a result", async ({ page }) => {
  await page.goto("/free-tools/spike-rank-bluesky", { waitUntil: "domcontentloaded" });

  const input = page.locator("input[type='text'], input:not([type]), textarea").first();
  await expect(input).toBeVisible();
  await input.fill("bsky.app");

  await page.locator("form button[type='submit'], form button").first().click();

  await expect(page.getByText(/scores \d+\/100/i).first()).toBeVisible({ timeout: 45_000 });
});

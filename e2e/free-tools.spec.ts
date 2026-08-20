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

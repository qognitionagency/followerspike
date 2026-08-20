import { test, expect } from "@playwright/test";

/**
 * The auth boundary: signed-out visitors cannot reach the app, and the hosted
 * Clerk sign-in UI actually mounts.
 */
const PROTECTED = ["/app", "/app/queue", "/app/settings", "/app/voice", "/admin"];

for (const path of PROTECTED) {
  test(`signed-out visitor is bounced from ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    // Clerk sends unauthenticated traffic to the sign-in URL.
    await expect(page).toHaveURL(/\/login|sign-in|accounts\.dev/);
  });
}

test("login page mounts the Clerk widget", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".cl-rootBox, .cl-signIn-root, form").first()).toBeVisible();
});

test("signup page mounts the Clerk widget", async ({ page }) => {
  await page.goto("/signup", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".cl-rootBox, .cl-signUp-root, form").first()).toBeVisible();
});

test("protected API routes reject anonymous callers with 401", async ({ request }) => {
  for (const path of ["/api/privacy/export", "/api/ai/post"]) {
    // An API caller should get a status code, never a redirect into HTML.
    const res = await request.post(path, { data: {}, failOnStatusCode: false, maxRedirects: 0 });
    expect(res.status(), `${path} should be unauthorized`).toBe(401);
  }
});

test("login redirect target stays relative (no open redirect from middleware)", async ({ request }) => {
  const res = await request.get("/app/settings", { maxRedirects: 0, failOnStatusCode: false });
  const location = res.headers()["location"] ?? "";
  const target = new URL(location, "https://example.test").searchParams.get("redirect_url");

  expect(target, "middleware should echo a path").toBe("/app/settings");
  expect(target?.startsWith("http"), "must never be absolute").toBe(false);
});

test("deleted cron endpoint is gone, not silently public", async ({ request }) => {
  const res = await request.post("/api/cron/dispatch", { data: {}, failOnStatusCode: false, maxRedirects: 0 });
  // 404 (removed) or 401 (protected) are both fine; 200 would mean it runs unauthenticated.
  expect([401, 404]).toContain(res.status());
});

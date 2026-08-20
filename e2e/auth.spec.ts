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

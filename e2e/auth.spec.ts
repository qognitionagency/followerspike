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

/**
 * Both of these shipped broken. The middleware treated any path not on the
 * public allowlist as protected, so a URL that simply did not exist answered
 * 307 to /login rather than 404, and `/opengraph-image` did the same, which
 * meant every social unfurl of this site fetched a login page instead of a card.
 */
test("an unknown URL renders the 404 page instead of redirecting to login", async ({ request }) => {
  const res = await request.get("/definitely-not-a-real-page-98713", {
    maxRedirects: 0,
    failOnStatusCode: false,
  });

  expect(res.status(), "a dead link must 404, not redirect").toBe(404);
  expect(await res.text()).toContain("This page does not exist");
});

test("the social card is fetchable without a session", async ({ request }) => {
  const res = await request.get("/opengraph-image", { maxRedirects: 0, failOnStatusCode: false });

  expect(res.status(), "crawlers have no session and must still get the image").toBe(200);
  expect(res.headers()["content-type"] ?? "").toContain("image");
});

test("protected routes still redirect a signed-out visitor", async ({ request }) => {
  // The counterpart to the two above: loosening the middleware must not have
  // loosened what it actually guards.
  for (const path of ["/app", "/app/settings", "/admin"]) {
    const res = await request.get(path, { maxRedirects: 0, failOnStatusCode: false });
    expect(res.status(), `${path} must not be public`).toBe(307);
    expect(res.headers()["location"] ?? "", `${path} redirects to login`).toContain("/login");
  }
});

test("protected API routes answer 401 rather than redirecting", async ({ request }) => {
  const res = await request.post("/api/ai/post", {
    data: { topicSeed: "anything" },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  expect(res.status()).toBe(401);
});

test("deleted cron endpoint is gone, not silently public", async ({ request }) => {
  const res = await request.post("/api/cron/dispatch", { data: {}, failOnStatusCode: false, maxRedirects: 0 });
  // 404 (removed) or 401 (protected) are both fine; 200 would mean it runs unauthenticated.
  expect([401, 404]).toContain(res.status());
});

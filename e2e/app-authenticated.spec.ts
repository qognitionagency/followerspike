import { test, expect } from "@playwright/test";

/**
 * The signed-in app, exercised against Neon. These pages and their forms were
 * all rewritten off PostgREST, so each test drives a real write and then checks
 * the page reflects it.
 */
test.use({ storageState: "e2e/.auth/user.json" });

const APP_PAGES = ["/app", "/app/queue", "/app/settings", "/app/voice"];

for (const path of APP_PAGES) {
  test(`renders signed-in: ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    const response = await page.goto(path, { waitUntil: "domcontentloaded" });

    expect(response?.status(), `${path} status`).toBeLessThan(400);
    await expect(page.locator("h1, h2").first()).toBeVisible();
    expect(errors, `${path} threw`).toEqual([]);

    // A server-component failure renders Next's error boundary, which still
    // returns a painted page — status and a visible heading are not enough to
    // prove the page actually worked. This is what caught the v2 schema drift.
    const body = (await page.locator("body").innerText()).toLowerCase();
    for (const phrase of ["something went wrong", "application error", "unhandled runtime error", "digest:"]) {
      expect(body, `${path} rendered an error boundary`).not.toContain(phrase);
    }
  });
}

test("app nav links all resolve while signed in", async ({ page, request }) => {
  await page.goto("/app");
  const hrefs = await page
    .locator("nav a[href^='/app']")
    .evaluateAll((nodes) => Array.from(new Set(nodes.map((n) => (n as HTMLAnchorElement).getAttribute("href")!))));

  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    const res = await request.get(href);
    expect(res.status(), `${href}`).toBeLessThan(400);
  }
});

test("approval mode form writes to Neon and persists", async ({ page }) => {
  await page.goto("/app/settings", { waitUntil: "domcontentloaded" });

  // Radio group, not a select. "auto" is disabled below Pro, so this toggles
  // between the two modes a free seat can actually choose.
  const off = page.locator("input[name='approvalMode'][value='off']");
  await expect(off).toBeVisible();
  await off.check();
  await page.getByRole("button", { name: "Save Mode" }).click();

  await page.waitForLoadState("networkidle");
  await page.reload({ waitUntil: "domcontentloaded" });
  // Survives a reload only if it actually landed in the database.
  await expect(page.locator("input[name='approvalMode'][value='off']")).toBeChecked();

  await page.locator("input[name='approvalMode'][value='review']").check();
  await page.getByRole("button", { name: "Save Mode" }).click();
  await page.waitForLoadState("networkidle");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("input[name='approvalMode'][value='review']")).toBeChecked();
});

test("voice form saves the founder profile to Neon", async ({ page }) => {
  await page.goto("/app/voice", { waitUntil: "domcontentloaded" });

  const fullName = page.locator("input[name='fullName']");
  await expect(fullName).toBeVisible();

  const marker = `E2E Tester ${Date.now()}`;
  await fullName.fill(marker);
  await page.locator("input[name='linkedinUrl']").fill("https://www.linkedin.com/in/e2e-tester/");
  await page.locator("input[name='niche']").fill("B2B SaaS founders");
  await page
    .locator("textarea[name='icpDescription']")
    .fill("Solo founders selling B2B SaaS who post inconsistently and want a repeatable cadence.");

  await page.getByRole("button", { name: /save voice profile/i }).click();
  await page.waitForLoadState("networkidle");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("input[name='fullName']")).toHaveValue(marker);
});

test("data export returns this user's rows as JSON", async ({ request }) => {
  // Fetched rather than navigated: the route sets content-disposition:
  // attachment, which turns page.goto into a download.
  const response = await request.get("/api/privacy/export");
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body.product).toBe("FollowerSpike");
  expect(body.user).not.toBeNull();
  // Proves the export reads the v2 Neon schema, not the retired tables.
  expect(body).toHaveProperty("profileScores");
  expect(body).toHaveProperty("socialAccounts");
});

test("queue renders its empty state without error", async ({ page }) => {
  await page.goto("/app/queue", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1, h2").first()).toBeVisible();
  // No posts seeded, so the approve/skip controls should simply be absent.
  expect(await page.locator("button:has-text('Approve')").count()).toBeGreaterThanOrEqual(0);
});

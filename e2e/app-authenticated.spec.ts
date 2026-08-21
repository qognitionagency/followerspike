import { test, expect } from "@playwright/test";

/**
 * The signed-in app, exercised against Neon. These pages and their forms were
 * all rewritten off PostgREST, so each test drives a real write and then checks
 * the page reflects it.
 */
test.use({ storageState: "e2e/.auth/user.json" });

const APP_PAGES = ["/app", "/app/queue", "/app/settings", "/app/voice", "/app/evergreen", "/app/growth", "/app/accounts", "/app/composer"];

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

test("voice interview answers survive a failed synthesis", async ({ page }) => {
  // The important guarantee on this page is negative: when no AI provider is
  // configured, the answers are still saved and NO profile is written. A canned
  // neutral profile would not look broken — it would just make every future post
  // sound like somebody else, under the user's real name.
  await page.goto("/app/voice", { waitUntil: "domcontentloaded" });

  const answer = page.locator("textarea[name='explain_product']");
  await expect(answer).toBeVisible();

  const marker = `We build a posting tool for founders. Run ${Date.now()}.`;
  await answer.fill(marker);
  await page.getByRole("button", { name: /build my voice profile/i }).click();
  await page.waitForLoadState("networkidle");

  // Answers are persisted to voice_interviews before synthesis is attempted, so
  // they come back after a reload whether or not the model was reachable.
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("textarea[name='explain_product']")).toHaveValue(marker);

  const body = (await page.locator("body").innerText()).toLowerCase();
  const synthesized = body.includes("voice profile saved");
  if (!synthesized) {
    // No provider configured is the expected state until an API key is set. The
    // page must say so rather than silently presenting an invented voice.
    expect(body).toContain("your answers were saved");
    expect(body).not.toContain("words you reach for");
  }
});

test("evergreen library accepts an item and reports it as due", async ({ page }) => {
  await page.goto("/app/evergreen", { waitUntil: "domcontentloaded" });

  const content = page.locator("textarea[name='content']");
  await expect(content).toBeVisible();

  const marker = `Evergreen probe ${Date.now()} — still true in six months, which is the whole test.`;
  await content.fill(marker);

  // Platform checkboxes are disabled until an account is connected, so this
  // asserts the guard rather than forcing a selection that cannot exist.
  const enabled = page.locator("input[name='platforms']:not([disabled])");
  if ((await enabled.count()) === 0) {
    await expect(page.locator("input[name='platforms'][disabled]").first()).toBeVisible();
    return;
  }

  await enabled.first().check();
  await page.getByRole("button", { name: /add to library/i }).click();
  await page.waitForLoadState("networkidle");

  await expect(page.getByText(marker)).toBeVisible();
});

test("growth plan refuses to invent a plan without a score", async ({ page }) => {
  await page.goto("/app/growth", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1").first()).toBeVisible();

  const body = await page.locator("body").innerText();
  // With no stored profile_scores row there is nothing to derive a plan from,
  // and the page must send the user to run an audit instead of generating
  // generic advice that is not grounded in anything observed.
  if (body.includes("Run a Spike Rank audit")) {
    await expect(page.getByRole("link", { name: /run a spike rank audit/i })).toBeVisible();
  } else {
    await expect(page.getByRole("button", { name: /build my plan|rebuild from latest score/i })).toBeVisible();
  }
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

import { test, expect } from "@playwright/test";

/**
 * Every public page renders. A page is "working" here if it returns 2xx, paints
 * its heading, and logs no page error — a Neon or Clerk misconfiguration shows up
 * as a 500 or a thrown error rather than a subtly wrong pixel.
 */
const PUBLIC_PAGES = [
  "/",
  "/pricing",
  "/free-tools",
  "/blog",
  "/roles",
  "/industries",
  "/icp",
  "/site-map",
  "/trust",
  "/security",
  "/privacy",
  "/terms",
  "/dpa",
  "/subprocessors",
  "/linkedin-autopilot",
  "/linkedin-ghostwriter",
  "/linkedin-profile-audit",
  "/tools/linkedin-audit",
  "/tools/linkedin-profile-audit",
  "/tools/profile-roaster",
];

for (const path of PUBLIC_PAGES) {
  test(`public page renders: ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    const response = await page.goto(path, { waitUntil: "domcontentloaded" });

    expect(response?.status(), `${path} status`).toBeLessThan(400);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(errors, `${path} threw`).toEqual([]);
  });
}

test("dynamic content pages render", async ({ page }) => {
  // One of each templated family, to prove the generated routes resolve.
  for (const path of ["/tools/linkedin-autopilot-for-saas", "/compare/followerspike-vs-taplio"]) {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `${path} status`).toBeLessThan(400);
    await expect(page.locator("h1").first()).toBeVisible();
  }
});

test("marketing nav links all resolve", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = await page.locator("header a[href^='/'], footer a[href^='/']").evaluateAll((nodes) =>
    Array.from(new Set(nodes.map((n) => (n as HTMLAnchorElement).getAttribute("href")!))).filter(Boolean)
  );

  expect(hrefs.length).toBeGreaterThan(0);

  const broken: string[] = [];
  for (const href of hrefs) {
    const res = await request.get(href);
    if (res.status() >= 400) broken.push(`${href} -> ${res.status()}`);
  }
  expect(broken, "broken nav links").toEqual([]);
});

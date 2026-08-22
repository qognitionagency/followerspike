import { test, expect } from "@playwright/test";

/**
 * Cover for metadata that was shipped and did not work.
 *
 * All of this is invisible in the product: a broken social card or a missing
 * favicon looks exactly like a working one until somebody pastes a link
 * somewhere. Three separate defects reached production this way, so each has an
 * assertion here rather than a manual check.
 */
test.describe("metadata that only crawlers see", () => {
  test("the social card is served, and served as an image", async ({ request }) => {
    const res = await request.get("/opengraph-image", { maxRedirects: 0, failOnStatusCode: false });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"] ?? "").toContain("image");
  });

  test("the favicon and apple icon both exist", async ({ request }) => {
    // apple-icon was an .svg for a while, which Next's file convention ignores
    // silently: the build emitted nothing and no tag ever appeared.
    for (const path of ["/icon.svg", "/apple-icon"]) {
      const res = await request.get(path, { maxRedirects: 0, failOnStatusCode: false });
      expect(res.status(), `${path} should be served`).toBe(200);
      expect(res.headers()["content-type"] ?? "", `${path} should be an image`).toContain("image");
    }
  });

  test("every marketing page references the social card", async ({ page }) => {
    // The homepage overrides openGraph, and a page that does so loses the
    // inherited card unless it names it. It was the only page missing og:image.
    for (const path of ["/", "/pricing", "/blog"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const image = page.locator('meta[property="og:image"]');
      await expect(image, `${path} should declare og:image`).toHaveCount(1);
      const content = await image.getAttribute("content");
      expect(content, `${path} og:image should point somewhere`).toBeTruthy();
    }
  });

  test("the homepage declares a canonical and a twitter card", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image"
    );
  });
});

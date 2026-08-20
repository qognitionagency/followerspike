import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test as setup, expect } from "@playwright/test";

const STORAGE = "e2e/.auth/user.json";

/**
 * Signs the shared test user in and saves the session for the authenticated specs.
 *
 * This uses a Clerk sign-in ticket rather than driving the password form. Clerk
 * challenges every new device with an emailed code, which a headless run cannot
 * satisfy; a ticket minted by the Backend API is the supported way in. The login
 * form itself is covered separately in auth.spec.ts.
 */
setup("authenticate", async ({ page, request }) => {
  const response = await request.post("https://api.clerk.com/v1/sign_in_tokens", {
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    data: { user_id: process.env.E2E_CLERK_USER_ID, expires_in_seconds: 600 },
  });

  expect(response.ok(), `sign-in token request failed: ${await response.text()}`).toBeTruthy();
  const { token } = await response.json();

  await setupClerkTestingToken({ page });
  await page.goto(`/login?__clerk_ticket=${token}`, { waitUntil: "domcontentloaded" });

  await page.waitForURL(/\/app/, { timeout: 30_000 });
  await expect(page.locator("nav a[href='/app/queue']").first()).toBeVisible();

  await page.context().storageState({ path: STORAGE });
});

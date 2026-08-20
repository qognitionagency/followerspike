import { test, expect } from "@playwright/test";
import { neon } from "@neondatabase/serverless";

/**
 * The admin console. Access is gated on users.is_admin, so the test promotes the
 * shared test user first and demotes it afterwards — otherwise the gate would be
 * untestable without a hand-seeded account.
 */
test.use({ storageState: "e2e/.auth/user.json" });

// Serial, not parallel: these tests share one mutable flag (users.is_admin) and
// one settings row. Split across workers, one worker's afterAll tears down state
// the other is still using.
test.describe.configure({ mode: "serial" });

const sql = neon(process.env.DATABASE_URL!);
const clerkUserId = process.env.E2E_CLERK_USER_ID!;

test.beforeAll(async () => {
  await sql`update users set is_admin = true where clerk_user_id = ${clerkUserId}`;
});

test.afterAll(async () => {
  await sql`update users set is_admin = false where clerk_user_id = ${clerkUserId}`;
  await sql`delete from system_settings where key = 'automation_global_paused'`;
});

test("admin console renders for an admin", async ({ page }) => {
  const response = await page.goto("/admin", { waitUntil: "domcontentloaded" });

  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: /control room/i })).toBeVisible();

  const body = (await page.locator("body").innerText()).toLowerCase();
  expect(body).not.toContain("something went wrong");
});

test("global pause switch writes to Neon, and resume flips it back", async ({ page }) => {
  const pausedValue = async () => {
    const rows = await sql`select value from system_settings where key = 'automation_global_paused'`;
    return rows.length ? (rows[0].value as { paused: boolean }).paused : null;
  };

  await page.goto("/admin", { waitUntil: "domcontentloaded" });

  await page.locator("input[name='reason']").fill("e2e pause probe");
  await page.getByRole("button", { name: /pause all automation/i }).click();

  // The server action posts and revalidates, so the write can land after the
  // navigation settles; poll rather than reading once.
  await expect.poll(pausedValue, { timeout: 20_000, message: "pause switch should write" }).toBe(true);

  await page.getByRole("button", { name: /resume automation/i }).click();
  await expect.poll(pausedValue, { timeout: 20_000, message: "resume switch should write" }).toBe(false);
});

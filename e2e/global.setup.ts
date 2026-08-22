import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { databaseConfigured, db } from "@/lib/db";

/**
 * Fetches a testing token so Clerk does not bot-block automated sign-in.
 *
 * Skipped when there is no Clerk secret to fetch it with. Every project depends
 * on this setup, so a hard failure here takes the whole run down with it —
 * including the specs that need no Clerk at all. A checkout with no secrets
 * (a fork's pull request, a fresh clone) should still be able to run the pure
 * logic specs, and the specs that genuinely need Clerk fail on their own terms
 * rather than behind a confusing setup error.
 */
setup("clerk setup", async () => {
  if (!process.env.CLERK_SECRET_KEY) {
    setup.skip(true, "CLERK_SECRET_KEY is not set");
    return;
  }

  await clerkSetup();
});

/**
 * Clears the rate limit counters this run is about to spend.
 *
 * The free-tool specs make a dozen or so calls to `/api/free-tools/*`, and that
 * endpoint is rate limited per IP because it is public and runs an AI
 * generation per request. Every spec in a run shares one source address, so
 * without this the suite spends its own allowance and later tests get a 429
 * that looks like a product bug. Re-running the suite inside the same hour
 * failed for the same reason.
 *
 * Deleting rather than raising the limit, because the limit is the thing under
 * test in production and lowering the bar to fit the tests would defeat it.
 * This only ever removes counters for the loopback address the test server runs
 * on, so it cannot mask a real limit anywhere else.
 */
setup("reset rate limits", async () => {
  if (!databaseConfigured()) {
    setup.skip(true, "DATABASE_URL is not set");
    return;
  }

  const sql = db();
  await sql`
    delete from rate_limits
    where bucket like 'free-tool:%127.0.0.1'
       or bucket like 'free-tool:%::1'
       or bucket like 'free-tool:%:unknown'
  `;
});

import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

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

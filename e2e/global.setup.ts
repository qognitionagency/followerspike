import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

// Fetches a testing token so Clerk does not bot-block automated sign-in.
setup("clerk setup", async () => {
  await clerkSetup();
});

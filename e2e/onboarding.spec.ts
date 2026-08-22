import { test, expect } from "@playwright/test";
import { onboardingState } from "../lib/onboarding";

/**
 * The step order is a dependency chain, not a preference: publishing needs a
 * connection, and the voice engine needs posts to read from one. These assert
 * that the chain cannot be presented out of order.
 */
test.describe("first-run setup", () => {
  test("a brand new workspace is told to connect first", () => {
    const state = onboardingState({ connectedAccounts: 0, hasVoiceProfile: false, hasAnyPost: false });
    expect(state.complete).toBe(false);
    expect(state.doneCount).toBe(0);
    expect(state.current?.id).toBe("connect");
  });

  test("voice comes only after an account exists", () => {
    const state = onboardingState({ connectedAccounts: 1, hasVoiceProfile: false, hasAnyPost: false });
    expect(state.current?.id).toBe("voice");
    expect(state.doneCount).toBe(1);
  });

  test("publishing is the last step", () => {
    const state = onboardingState({ connectedAccounts: 1, hasVoiceProfile: true, hasAnyPost: false });
    expect(state.current?.id).toBe("publish");
    expect(state.doneCount).toBe(2);
  });

  test("a finished setup has no current step, so the dashboard takes over", () => {
    const state = onboardingState({ connectedAccounts: 2, hasVoiceProfile: true, hasAnyPost: true });
    expect(state.complete).toBe(true);
    expect(state.current).toBeNull();
    expect(state.doneCount).toBe(3);
  });

  test("a later step done out of order never skips an earlier one", () => {
    // Someone who wrote a draft before connecting anything is still sent to
    // connect first, because the draft cannot publish without a connection.
    const state = onboardingState({ connectedAccounts: 0, hasVoiceProfile: false, hasAnyPost: true });
    expect(state.current?.id).toBe("connect");
    expect(state.complete).toBe(false);
  });

  test("every step names where it goes", () => {
    const state = onboardingState({ connectedAccounts: 0, hasVoiceProfile: false, hasAnyPost: false });
    for (const step of state.steps) {
      expect(step.href.startsWith("/app/"), `${step.id} points into the app`).toBe(true);
      expect(step.cta.length).toBeGreaterThan(0);
    }
  });
});

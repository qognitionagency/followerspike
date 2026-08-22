/**
 * What a new member still has to do before the product does anything for them.
 *
 * Signing up used to land on a dashboard with six equally weighted nav items, a
 * headline describing the product, and four stat cards all reading zero. Every
 * one of those is a dead end until an account is connected, because publishing
 * needs a connection, the voice engine needs posts to read, and the composer
 * needs somewhere to publish to. The order is not a preference, it is a
 * dependency chain, and the dashboard was presenting it as a menu.
 *
 * Three steps, and only the current one is actionable.
 */

export type OnboardingStepId = "connect" | "voice" | "publish";

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  body: string;
  href: string;
  cta: string;
  done: boolean;
};

export type OnboardingState = {
  steps: OnboardingStep[];
  /** The first unfinished step, or null once everything is done. */
  current: OnboardingStep | null;
  complete: boolean;
  doneCount: number;
};

export function onboardingState(input: {
  connectedAccounts: number;
  hasVoiceProfile: boolean;
  hasAnyPost: boolean;
}): OnboardingState {
  const steps: OnboardingStep[] = [
    {
      id: "connect",
      title: "Connect an account",
      // Bluesky named specifically because it is the only one that works today
      // with no approval queue in front of it. Pointing a new member at X or
      // LinkedIn first sends them to a developer portal, not to a first post.
      body: "Bluesky takes about a minute with an app password and needs no approval. X and LinkedIn need a registered app first.",
      href: "/app/accounts",
      cta: "Connect Bluesky",
      done: input.connectedAccounts > 0,
    },
    {
      id: "voice",
      title: "Build your voice",
      body: "We read the posts on your connected account and model how you write. One button, nothing to type.",
      href: "/app/voice",
      cta: "Build my voice",
      done: input.hasVoiceProfile,
    },
    {
      id: "publish",
      title: "Write your first post",
      body: "Draft it in your own voice, see it per platform, and approve it before anything goes out.",
      href: "/app/composer",
      cta: "Open the composer",
      done: input.hasAnyPost,
    },
  ];

  const current = steps.find((step) => !step.done) ?? null;

  return {
    steps,
    current,
    complete: current === null,
    doneCount: steps.filter((step) => step.done).length,
  };
}

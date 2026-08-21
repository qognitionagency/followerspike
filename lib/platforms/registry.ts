/**
 * The one place that knows which adapter belongs to which platform.
 *
 * Everything outside `lib/platforms` should reach a platform through here, so
 * that adding a fourth network is a change to this map rather than a hunt for
 * `switch (platform)` statements. Capabilities are re-exported as plain data
 * because the UI needs them without pulling an adapter's fetch code into a
 * client bundle.
 */
import { blueskyAdapter } from "@/lib/platforms/bluesky-write";
import { linkedinAdapter } from "@/lib/platforms/linkedin";
import { xAdapter } from "@/lib/platforms/x";
import {
  PlatformUnsupportedError,
  type PlatformAdapter,
  type PlatformCapabilities,
} from "@/lib/platforms/types";
import type { Platform } from "@/lib/types/db";

const ADAPTERS: Record<Platform, PlatformAdapter> = {
  bluesky: blueskyAdapter,
  linkedin: linkedinAdapter,
  x: xAdapter,
};

/** Display order: the platforms the product leads with come first. */
export const ALL_PLATFORMS: readonly Platform[] = ["x", "linkedin", "bluesky"] as const;

export function getAdapter(platform: Platform): PlatformAdapter {
  return ADAPTERS[platform];
}

/** Narrows an untrusted string — a query param, a database column — to `Platform`. */
export function isPlatform(value: string): value is Platform {
  return value === "x" || value === "linkedin" || value === "bluesky";
}

/**
 * Capabilities without the adapter. Safe to call from a server component that
 * renders the connection or automation UI.
 */
export function platformCapabilities(platform: Platform): PlatformCapabilities {
  return ADAPTERS[platform].capabilities;
}

export function capabilityMatrix(): Record<Platform, PlatformCapabilities> {
  return {
    x: ADAPTERS.x.capabilities,
    linkedin: ADAPTERS.linkedin.capabilities,
    bluesky: ADAPTERS.bluesky.capabilities,
  };
}

type BooleanCapability = {
  [K in keyof PlatformCapabilities]: PlatformCapabilities[K] extends boolean ? K : never;
}[keyof PlatformCapabilities];

export function supports(platform: Platform, capability: BooleanCapability): boolean {
  return ADAPTERS[platform].capabilities[capability];
}

/**
 * The platforms where a feature is real. Lets a settings page render "keyword
 * capture works on X and Bluesky" from the adapters rather than from a hardcoded
 * list that can drift away from them.
 */
export function platformsSupporting(capability: BooleanCapability): Platform[] {
  return ALL_PLATFORMS.filter((platform) => ADAPTERS[platform].capabilities[capability]);
}

/**
 * Throws before any network call when a caller asks a platform for something it
 * cannot do. Use it at the top of an automation, so the run is logged as
 * skipped rather than failing halfway through.
 */
export function assertCapability(
  platform: Platform,
  capability: BooleanCapability,
  operation: string
): void {
  if (!ADAPTERS[platform].capabilities[capability]) {
    throw new PlatformUnsupportedError(platform, operation);
  }
}

/** Longest post this platform accepts, for the composer's character counter. */
export function maxChars(platform: Platform): number {
  return ADAPTERS[platform].capabilities.maxChars;
}

/**
 * Reading a member's own writing off their connected accounts.
 *
 * `synthesizeVoice` has always accepted `samples`, but the only way to supply
 * them was to paste posts into a textarea by hand. So the page that promised to
 * model your voice opened with a wall of text asking you to go and collect it,
 * and the shortest path to a profile was answering eight interview questions
 * about how you write instead of just showing the model what you wrote.
 *
 * This closes that gap. If an account is connected, its posts are already
 * reachable and nobody should be asked to fetch them by hand.
 *
 * Bluesky works with no credentials at all: `getAuthorFeed` reads the public
 * AppView, the same source Spike Rank already scores from. X and LinkedIn need
 * a registered OAuth app before their timelines can be read, so they report as
 * unavailable with the reason rather than silently contributing nothing.
 */
import { getAuthorFeed } from "@/lib/platforms/bluesky";
import { activeConnections, type ConnectedAccount } from "@/lib/platforms/connect";
import type { Platform } from "@/lib/types/db";

/**
 * Long enough to carry rhythm. A one-line reply says nothing about how somebody
 * writes, and padding the sample set with them teaches the model that the voice
 * is terse when it is really just being agreeable.
 */
const MIN_SAMPLE_CHARS = 80;

/** Enough for a profile without spending the whole prompt budget on examples. */
const MAX_SAMPLES = 25;

export type VoiceSource = {
  platform: Platform;
  handle: string;
  /** Posts long enough to be worth learning from. Empty when unavailable. */
  samples: string[];
  /** Null when the source worked. A short reason for the UI when it did not. */
  unavailable: string | null;
};

/** A source has to carry a few real posts before it can teach anything. */
export const MIN_SAMPLES_FOR_VOICE = 5;

function usable(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < MIN_SAMPLE_CHARS) return false;
  // A post that is mostly a link is a share, not writing.
  const withoutLinks = trimmed.replace(/https?:\/\/\S+/g, "").trim();
  return withoutLinks.length >= MIN_SAMPLE_CHARS;
}

async function readSource(account: ConnectedAccount): Promise<VoiceSource> {
  const base = { platform: account.platform, handle: account.handle };

  if (account.platform !== "bluesky") {
    return {
      ...base,
      samples: [],
      unavailable: `${account.platform === "x" ? "X" : "LinkedIn"} needs a registered OAuth app before its posts can be read`,
    };
  }

  try {
    const posts = await getAuthorFeed(account.handle, 60);
    const samples = posts
      .map((post) => post.text.trim())
      .filter(usable)
      .slice(0, MAX_SAMPLES);

    return {
      ...base,
      samples,
      unavailable:
        samples.length >= MIN_SAMPLES_FOR_VOICE
          ? null
          : `Only ${samples.length} post${samples.length === 1 ? "" : "s"} long enough to learn from`,
    };
  } catch {
    // A reachable-but-failing AppView is a temporary condition, and the page
    // still has the interview to offer. Never a thrown error on a page load.
    return { ...base, samples: [], unavailable: "Could not reach Bluesky just now" };
  }
}

/** Every connected account, with whatever writing we could read from it. */
export async function voiceSources(workspaceId: string): Promise<VoiceSource[]> {
  const accounts = await activeConnections(workspaceId);
  return Promise.all(accounts.map(readSource));
}

/** The pooled writing across every source that had enough of it. */
export function samplesFrom(sources: VoiceSource[]): string[] {
  return sources.flatMap((source) => source.samples).slice(0, MAX_SAMPLES);
}

/** Whether there is enough real writing to skip the interview entirely. */
export function canBuildFromPosts(sources: VoiceSource[]): boolean {
  return samplesFrom(sources).length >= MIN_SAMPLES_FOR_VOICE;
}

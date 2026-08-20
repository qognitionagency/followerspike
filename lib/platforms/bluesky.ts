/**
 * Bluesky public read access.
 *
 * The AppView at public.api.bsky.app serves unauthenticated reads of public
 * profiles and feeds, which is why Bluesky Spike Rank can run ungated and free.
 * Authenticated writes (applying a profile fix) go through the user's PDS with
 * their OAuth session and live in a separate module.
 */

const PUBLIC_APPVIEW = "https://public.api.bsky.app/xrpc";

export type BlueskyProfile = {
  did: string;
  handle: string;
  displayName: string | null;
  description: string | null;
  avatar: string | null;
  banner: string | null;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  createdAt: string | null;
  hasPinnedPost: boolean;
  isVerified: boolean;
};

export type BlueskyPost = {
  uri: string;
  text: string;
  createdAt: string;
  replyCount: number;
  repostCount: number;
  likeCount: number;
  /** True when this record is the author replying, not an original post. */
  isReply: boolean;
  hasImages: boolean;
  hasExternalLink: boolean;
};

export class BlueskyNotFoundError extends Error {
  constructor(handle: string) {
    super(`No Bluesky account found for "${handle}"`);
    this.name = "BlueskyNotFoundError";
  }
}

function normalizeHandle(input: string): string {
  return input
    .trim()
    .replace(/^@/, "")
    .replace(/^(?:https?:\/\/)?bsky\.app\/profile\//i, "")
    .replace(/\/+$/, "");
}

async function appview<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${PUBLIC_APPVIEW}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: { accept: "application/json" },
    // Public profile data changes slowly; caching keeps repeat audits off the network.
    next: { revalidate: 900 },
  });

  if (response.status === 400 || response.status === 404) {
    throw new BlueskyNotFoundError(params.actor ?? path);
  }

  if (!response.ok) {
    throw new Error(`Bluesky request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export async function getProfile(handleInput: string): Promise<BlueskyProfile> {
  const actor = normalizeHandle(handleInput);
  const data = await appview<{
    did: string;
    handle: string;
    displayName?: string;
    description?: string;
    avatar?: string;
    banner?: string;
    followersCount?: number;
    followsCount?: number;
    postsCount?: number;
    createdAt?: string;
    pinnedPost?: { uri?: string };
    verification?: { verifiedStatus?: string };
  }>("app.bsky.actor.getProfile", { actor });

  return {
    did: data.did,
    handle: data.handle,
    displayName: data.displayName ?? null,
    description: data.description ?? null,
    avatar: data.avatar ?? null,
    banner: data.banner ?? null,
    followersCount: data.followersCount ?? 0,
    followsCount: data.followsCount ?? 0,
    postsCount: data.postsCount ?? 0,
    createdAt: data.createdAt ?? null,
    hasPinnedPost: Boolean(data.pinnedPost?.uri),
    isVerified: data.verification?.verifiedStatus === "valid",
  };
}

type FeedResponse = {
  feed?: Array<{
    post?: {
      uri?: string;
      record?: {
        text?: string;
        createdAt?: string;
        reply?: unknown;
        embed?: { $type?: string; external?: unknown; images?: unknown[] };
      };
      replyCount?: number;
      repostCount?: number;
      likeCount?: number;
    };
    reason?: { $type?: string };
  }>;
};

export async function getAuthorFeed(handleInput: string, limit = 30): Promise<BlueskyPost[]> {
  const actor = normalizeHandle(handleInput);
  const data = await appview<FeedResponse>("app.bsky.feed.getAuthorFeed", {
    actor,
    limit: String(Math.min(Math.max(limit, 1), 100)),
    filter: "posts_with_replies",
  });

  return (data.feed ?? [])
    // Reposts carry a `reason` and are somebody else's writing, so they are not scored as output.
    .filter((item) => !item.reason && item.post?.record?.createdAt)
    .map((item) => {
      const post = item.post!;
      const record = post.record!;
      const embedType = record.embed?.$type ?? "";

      return {
        uri: post.uri ?? "",
        text: record.text ?? "",
        createdAt: record.createdAt!,
        replyCount: post.replyCount ?? 0,
        repostCount: post.repostCount ?? 0,
        likeCount: post.likeCount ?? 0,
        isReply: Boolean(record.reply),
        hasImages: embedType.includes("images") || Array.isArray(record.embed?.images),
        hasExternalLink: embedType.includes("external") || Boolean(record.embed?.external),
      };
    });
}

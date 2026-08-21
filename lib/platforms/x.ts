/**
 * X (Twitter) adapter, API v2.
 *
 * The request shapes here are the real ones — endpoints, bodies, headers, and
 * the OAuth 2 refresh exchange — but nothing has ever run against a live
 * account, because X requires a paid developer project and this deployment has
 * no app registered. Every method therefore checks for the OAuth app's
 * credentials first and throws `PlatformNotConfiguredError` naming the missing
 * variable. That check is not ceremony: a user access token cannot exist
 * without an app, and cannot be refreshed without the app's secret, so a token
 * present in `social_accounts` while `X_CLIENT_ID` is unset would be one that
 * dies at its first expiry with no way to renew it.
 *
 * The alternative — returning a plausible-looking `PublishResult` — is the
 * failure mode worth designing against. A queue that reports "published" while
 * posting nothing is worse than one that reports a configuration error.
 */
import { optionalEnv } from "@/lib/env";
import {
  PlatformAuthError,
  PlatformNotConfiguredError,
  PlatformRequestError,
  PlatformUnsupportedError,
  assertPublishable,
  platformFetch,
  platformJson,
  type DmRecipient,
  type DmResult,
  type FetchRepliesOptions,
  type PlatformAdapter,
  type PlatformCapabilities,
  type PlatformCredentials,
  type PlatformProfile,
  type PlatformReply,
  type PostRef,
  type PublishResult,
  type PublishTarget,
  type RefreshedToken,
} from "@/lib/platforms/types";

const API_BASE = "https://api.x.com/2";
const TOKEN_ENDPOINT = "https://api.x.com/2/oauth2/token";

const CAPABILITIES: PlatformCapabilities = {
  publish: true,
  readReplies: true,
  dm: true,
  // 280 for standard accounts. Premium raises it, but we cannot tell from the
  // token which the user holds, so the floor is the safe number to enforce.
  maxChars: 280,
  supportsThreads: true,
};

type OAuthApp = { clientId: string; clientSecret: string };

/**
 * Reads the registered app's credentials, or names the one that is missing.
 * Called before every request so a misconfigured deployment fails identically
 * on publish, read, and DM instead of only where a secret happens to be used.
 */
function oauthApp(): OAuthApp {
  const clientId = optionalEnv("X_CLIENT_ID");
  if (!clientId) throw new PlatformNotConfiguredError("x", "X_CLIENT_ID");

  const clientSecret = optionalEnv("X_CLIENT_SECRET");
  if (!clientSecret) throw new PlatformNotConfiguredError("x", "X_CLIENT_SECRET");

  return { clientId, clientSecret };
}

function authHeaders(credentials: PlatformCredentials): Record<string, string> {
  if (!credentials.accessToken) throw new PlatformAuthError("x", "no access token is stored");
  return {
    accept: "application/json",
    authorization: `Bearer ${credentials.accessToken}`,
  };
}

function postUrl(handle: string, id: string): string {
  return `https://x.com/${handle.replace(/^@/, "")}/status/${id}`;
}

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

type CreateTweetBody = {
  text: string;
  reply?: { in_reply_to_tweet_id: string };
  media?: { media_ids: string[] };
};

type CreateTweetResponse = { data?: { id?: string; text?: string } };

async function publish(
  credentials: PlatformCredentials,
  target: PublishTarget
): Promise<PublishResult> {
  oauthApp();
  assertPublishable("x", CAPABILITIES, target.content);

  if ((target.mediaUrls ?? []).length > 0) {
    // Attaching media means uploading each file through the media endpoint and
    // passing the returned ids here. That is a separate, chunked upload flow
    // that has not been built; dropping the images instead would publish a post
    // the user did not write.
    throw new PlatformUnsupportedError("x", "media attachments", "image upload is not wired up yet");
  }

  const body: CreateTweetBody = { text: target.content };
  if (target.replyTo) {
    body.reply = { in_reply_to_tweet_id: target.replyTo.id };
  }

  const response = await platformFetch("x", `${API_BASE}/tweets`, {
    method: "POST",
    headers: { ...authHeaders(credentials), "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await platformJson<CreateTweetResponse>("x", response, "publish");
  const id = data.data?.id;
  if (!id) throw new PlatformRequestError("x", response.status, "publish");

  const publishedAt = new Date().toISOString();

  return {
    platform: "x",
    platformPostId: id,
    platformPostUrl: postUrl(credentials.handle, id),
    ref: {
      id,
      // X threads by conversation, and the conversation id of a root post is
      // the post's own id — so this stays correct all the way down a thread.
      rootId: target.replyTo?.rootId ?? target.replyTo?.id ?? id,
    },
    publishedAt,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

type UserResponse = {
  data?: {
    id?: string;
    username?: string;
    name?: string;
    profile_image_url?: string;
    public_metrics?: { followers_count?: number };
  };
};

async function fetchProfile(credentials: PlatformCredentials): Promise<PlatformProfile> {
  oauthApp();

  const url = new URL(`${API_BASE}/users/me`);
  url.searchParams.set("user.fields", "profile_image_url,public_metrics,username,name");

  const response = await platformFetch("x", url, { headers: authHeaders(credentials) });
  const data = await platformJson<UserResponse>("x", response, "profile lookup");

  const user = data.data;
  if (!user?.id) throw new PlatformRequestError("x", response.status, "profile lookup");

  return {
    platform: "x",
    platformUserId: user.id,
    handle: user.username ?? credentials.handle,
    displayName: user.name ?? null,
    avatarUrl: user.profile_image_url ?? null,
    followersCount: user.public_metrics?.followers_count ?? null,
  };
}

type SearchResponse = {
  data?: Array<{
    id?: string;
    text?: string;
    author_id?: string;
    created_at?: string;
    conversation_id?: string;
  }>;
  includes?: { users?: Array<{ id?: string; username?: string; name?: string }> };
};

/**
 * Replies come from recent search on the conversation id — X has no
 * "replies to this post" endpoint. Two consequences worth knowing before
 * building on this: recent search only covers the last seven days, and it is
 * not available on the free access tier, so keyword capture on X needs at least
 * a Basic project.
 */
async function fetchReplies(
  credentials: PlatformCredentials,
  post: PostRef,
  options: FetchRepliesOptions = {}
): Promise<PlatformReply[]> {
  oauthApp();

  const conversationId = post.rootId ?? post.id;
  const url = new URL(`${API_BASE}/tweets/search/recent`);
  url.searchParams.set("query", `conversation_id:${conversationId} is:reply`);
  // The endpoint rejects max_results below 10.
  url.searchParams.set("max_results", String(Math.min(Math.max(options.limit ?? 50, 10), 100)));
  url.searchParams.set("tweet.fields", "author_id,created_at,conversation_id,in_reply_to_user_id");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "username,name");

  const response = await platformFetch("x", url, { headers: authHeaders(credentials) });
  const data = await platformJson<SearchResponse>("x", response, "reply lookup");

  const users = new Map(
    (data.includes?.users ?? [])
      .filter((user) => user.id)
      .map((user) => [user.id as string, user] as const)
  );

  return (data.data ?? [])
    .filter((tweet) => Boolean(tweet.id))
    .map((tweet) => {
      const author = tweet.author_id ? users.get(tweet.author_id) : undefined;
      return {
        id: tweet.id as string,
        authorPlatformUserId: tweet.author_id ?? "",
        authorHandle: author?.username ?? "",
        authorDisplayName: author?.name ?? null,
        text: tweet.text ?? "",
        createdAt: tweet.created_at ?? new Date().toISOString(),
        ref: { id: tweet.id as string, rootId: tweet.conversation_id ?? conversationId },
      };
    });
}

// ---------------------------------------------------------------------------
// DM
// ---------------------------------------------------------------------------

type DmResponse = { data?: { dm_conversation_id?: string; dm_event_id?: string } };

async function sendDm(
  credentials: PlatformCredentials,
  recipient: DmRecipient,
  message: string
): Promise<DmResult> {
  oauthApp();

  if (!recipient.platformUserId) {
    throw new PlatformUnsupportedError(
      "x",
      "messaging by handle",
      "a numeric user id is required — resolve the handle first"
    );
  }

  const response = await platformFetch(
    "x",
    `${API_BASE}/dm_conversations/with/${encodeURIComponent(recipient.platformUserId)}/messages`,
    {
      method: "POST",
      headers: { ...authHeaders(credentials), "content-type": "application/json" },
      body: JSON.stringify({ text: message }),
    }
  );

  const data = await platformJson<DmResponse>("x", response, "direct message");

  return {
    sentAt: new Date().toISOString(),
    conversationId: data.data?.dm_conversation_id ?? null,
    messageId: data.data?.dm_event_id ?? null,
  };
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

/**
 * X access tokens last two hours and the refresh token rotates on every use, so
 * the response's `refresh_token` must replace the stored one or the next
 * refresh fails. `lib/platforms/tokens.ts` writes both back together.
 */
async function refreshToken(credentials: PlatformCredentials): Promise<RefreshedToken> {
  const app = oauthApp();

  if (!credentials.refreshToken) {
    throw new PlatformAuthError("x", "no refresh token is stored");
  }

  const basic = Buffer.from(`${app.clientId}:${app.clientSecret}`).toString("base64");

  const response = await platformFetch("x", TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credentials.refreshToken,
      client_id: app.clientId,
    }).toString(),
  });

  const data = await platformJson<TokenResponse>("x", response, "token refresh");
  if (!data.access_token) throw new PlatformAuthError("x", "the refresh was rejected");

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? credentials.refreshToken,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
  };
}

export const xAdapter: PlatformAdapter = {
  platform: "x",
  capabilities: CAPABILITIES,
  publish,
  fetchProfile,
  fetchReplies,
  sendDm,
  refreshToken,
};

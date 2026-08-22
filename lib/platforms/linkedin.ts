/**
 * LinkedIn adapter, versioned REST API.
 *
 * Publishing is the only thing LinkedIn lets a normal app do on a member's
 * behalf. The `w_member_social` scope, granted by the standard "Share on
 * LinkedIn" product, covers creating a post as the authenticated member and
 * nothing else. Everything below is written against the live request shapes but
 * has never run: no app is registered on this deployment, so every method
 * checks for the OAuth app first and throws `PlatformNotConfiguredError` naming
 * the variable it wants.
 *
 * `capabilities.readReplies` is FALSE, and that is a product decision as much
 * as a technical one. There is no LinkedIn API for reading the comments on an
 * arbitrary post without Partner Program approval — the Social Actions
 * endpoints are gated behind Marketing Developer Platform access, which is
 * granted per-company after review and not to a self-serve SaaS. So keyword
 * capture cannot work here, and the honest move is for the UI to hide the
 * feature on LinkedIn rather than offer it and fail — which `lib/jobs/leads.ts`
 * does by branching on this flag, and `/app/automations` does by naming the
 * platforms where capture is real. Delivery is by email to an address the
 * replier volunteered, not by DM: no adapter can send a direct message on any
 * platform, so there is no private channel to answer on. Flipping the capture
 * flag to true would make the product page a lie before it made the code work.
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

const API_BASE = "https://api.linkedin.com";
const TOKEN_ENDPOINT = "https://www.linkedin.com/oauth/v2/accessToken";

/**
 * LinkedIn pins behaviour to a monthly version string and rejects requests
 * without one. Versions age out after about a year, hence the override.
 */
const DEFAULT_API_VERSION = "202508";

const CAPABILITIES: PlatformCapabilities = {
  publish: true,
  // See the module comment. Not a stub — there is no endpoint to call.
  readReplies: false,
  /** The Posts API caps `commentary` at 3000 characters. */
  maxChars: 3000,
  // LinkedIn has no native thread primitive. Long-form goes in one post, and a
  // follow-up would be a comment on your own post — a different feature.
  supportsThreads: false,
};

type OAuthApp = { clientId: string; clientSecret: string };

function oauthApp(): OAuthApp {
  const clientId = optionalEnv("LINKEDIN_CLIENT_ID");
  if (!clientId) throw new PlatformNotConfiguredError("linkedin", "LINKEDIN_CLIENT_ID");

  const clientSecret = optionalEnv("LINKEDIN_CLIENT_SECRET");
  if (!clientSecret) throw new PlatformNotConfiguredError("linkedin", "LINKEDIN_CLIENT_SECRET");

  return { clientId, clientSecret };
}

function apiVersion(): string {
  return optionalEnv("LINKEDIN_API_VERSION", DEFAULT_API_VERSION);
}

function restHeaders(credentials: PlatformCredentials): Record<string, string> {
  if (!credentials.accessToken) {
    throw new PlatformAuthError("linkedin", "no access token is stored");
  }

  return {
    accept: "application/json",
    authorization: `Bearer ${credentials.accessToken}`,
    "linkedin-version": apiVersion(),
    "x-restli-protocol-version": "2.0.0",
  };
}

/** Accepts either a bare member id or an already-formed URN. */
function personUrn(platformUserId: string): string {
  const value = platformUserId.trim();
  if (!value) throw new PlatformAuthError("linkedin", "the connected member id is missing");
  return value.startsWith("urn:li:") ? value : `urn:li:person:${value}`;
}

/**
 * `commentary` is LinkedIn's "Little Text" format, where a handful of
 * characters are reserved for entity mentions and hashtags. Left unescaped they
 * make the API reject the post with a 422, so plain user text is escaped here
 * rather than at the call site.
 */
const RESERVED_CHARACTERS = /([\\<>@[\]()~_{}|#*])/g;

function escapeCommentary(text: string): string {
  return text.replace(RESERVED_CHARACTERS, "\\$1");
}

function postUrl(urn: string): string {
  return `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}/`;
}

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

async function publish(
  credentials: PlatformCredentials,
  target: PublishTarget
): Promise<PublishResult> {
  oauthApp();
  // Counted before escaping — the limit applies to what the member sees.
  assertPublishable("linkedin", CAPABILITIES, target.content);

  if (target.replyTo) {
    throw new PlatformUnsupportedError(
      "linkedin",
      "threads",
      "a LinkedIn post cannot reply to another post"
    );
  }

  if ((target.mediaUrls ?? []).length > 0) {
    // Images go through the Images API — initializeUpload, PUT the bytes to the
    // returned URL, then reference the returned image URN in `content`. Not
    // built; failing is better than publishing the text without the image.
    throw new PlatformUnsupportedError(
      "linkedin",
      "media attachments",
      "image upload is not wired up yet"
    );
  }

  const body = {
    author: personUrn(credentials.platformUserId),
    commentary: escapeCommentary(target.content),
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  const response = await platformFetch("linkedin", `${API_BASE}/rest/posts`, {
    method: "POST",
    headers: { ...restHeaders(credentials), "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    // Reuses the shared status-to-error mapping; always throws on a non-2xx.
    await platformJson<unknown>("linkedin", response, "publish");
  }

  // A successful create returns 201 with an empty body — the new post's URN
  // comes back in a header, not in JSON.
  const urn = response.headers.get("x-restli-id") ?? response.headers.get("x-linkedin-id");
  if (!urn) throw new PlatformRequestError("linkedin", response.status, "publish");

  return {
    platform: "linkedin",
    platformPostId: urn,
    platformPostUrl: postUrl(urn),
    ref: { id: urn },
    publishedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

type UserInfoResponse = {
  sub?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

/**
 * The OpenID Connect userinfo endpoint, which the `openid profile` scopes
 * cover. It is the only profile read available without Partner approval, and it
 * carries no follower count — hence the null. Headline, About, and experience
 * are Full Profile fields and unavailable, which is why
 * `lib/rank/linkedin.ts` scores a pasted profile instead.
 */
async function fetchProfile(credentials: PlatformCredentials): Promise<PlatformProfile> {
  oauthApp();

  const response = await platformFetch("linkedin", `${API_BASE}/v2/userinfo`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${credentials.accessToken}`,
    },
  });

  const data = await platformJson<UserInfoResponse>("linkedin", response, "profile lookup");
  if (!data.sub) throw new PlatformRequestError("linkedin", response.status, "profile lookup");

  const name = data.name ?? [data.given_name, data.family_name].filter(Boolean).join(" ");

  return {
    platform: "linkedin",
    platformUserId: data.sub,
    handle: credentials.handle || data.sub,
    displayName: name || null,
    avatarUrl: data.picture ?? null,
    followersCount: null,
  };
}

/**
 * Always throws. Present only because `PlatformAdapter` requires it — callers
 * are meant to check `capabilities.readReplies` and never get here.
 */
async function fetchReplies(
  _credentials: PlatformCredentials,
  _post: PostRef,
  _options?: FetchRepliesOptions
): Promise<PlatformReply[]> {
  throw new PlatformUnsupportedError(
    "linkedin",
    "reading post comments",
    "the Social Actions API requires LinkedIn Partner Program approval"
  );
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
 * Refresh tokens are not issued to every app: a standard 3-legged token lasts
 * 60 days and the member must re-authorise, while programmatic refresh is an
 * approved-app feature. If no refresh token was stored, that is the situation,
 * and the account needs reconnecting rather than renewing.
 */
async function refreshToken(credentials: PlatformCredentials): Promise<RefreshedToken> {
  const app = oauthApp();

  if (!credentials.refreshToken) {
    throw new PlatformAuthError(
      "linkedin",
      "LinkedIn did not issue a refresh token, so the account must be reconnected"
    );
  }

  const response = await platformFetch("linkedin", TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credentials.refreshToken,
      client_id: app.clientId,
      client_secret: app.clientSecret,
    }).toString(),
  });

  const data = await platformJson<TokenResponse>("linkedin", response, "token refresh");
  if (!data.access_token) throw new PlatformAuthError("linkedin", "the refresh was rejected");

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? credentials.refreshToken,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
  };
}

export const linkedinAdapter: PlatformAdapter = {
  platform: "linkedin",
  capabilities: CAPABILITIES,
  publish,
  fetchProfile,
  fetchReplies,
  refreshToken,
};

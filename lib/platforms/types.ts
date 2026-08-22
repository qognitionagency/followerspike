/**
 * The one shape every publishing platform implements.
 *
 * X, LinkedIn, and Bluesky differ in almost every detail — auth scheme, post
 * identifier format, whether a thread is even a concept — so the rest of the
 * app should never branch on `platform` to decide *how* to do something. It
 * asks the registry for an adapter and calls the same five methods. Where a
 * platform genuinely cannot do a thing, that shows up as a `false` in
 * `capabilities`, never as a method that quietly does nothing.
 *
 * This module also owns the shared error taxonomy and the HTTP helper, because
 * every adapter needs both and neither belongs to a single platform. The helper
 * exists mainly to guarantee one thing: every outbound call in this directory
 * has an explicit timeout. A hung socket to X should surface as a failed
 * publish in seconds, not hold a serverless invocation open until the platform
 * kills it.
 */
import type { Platform } from "@/lib/types/db";

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/**
 * What a platform can actually do. The UI reads this to decide which controls
 * to render, so every field has to be true of the live API rather than
 * aspirational — a `true` here that the adapter cannot honour becomes a feature
 * the user is offered and then silently denied.
 */
export type PlatformCapabilities = {
  /** Can create a post on the user's behalf. */
  publish: boolean;
  /** Can read the replies/comments on a post we published. */
  readReplies: boolean;
  /** Can send a direct message. */
  dm: boolean;
  /** Hard character ceiling for a single post, counted in code points. */
  maxChars: number;
  /** Can chain posts into a native thread by replying to our own post. */
  supportsThreads: boolean;
};

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

/**
 * One account's decrypted credentials, as resolved from `social_accounts` by
 * `lib/platforms/tokens.ts`. Adapters never read the database themselves — they
 * are given credentials and make HTTP calls, which keeps them testable and
 * keeps token decryption in exactly one place.
 */
export type PlatformCredentials = {
  /** `social_accounts.id`. Carried so a refresh can be written back. */
  socialAccountId: string;
  platform: Platform;
  /**
   * Decrypted `access_token_enc`. An OAuth 2 bearer token on X and LinkedIn; a
   * Bluesky *app password*, which is a long-lived credential exchanged for a
   * short session on each use rather than a bearer token itself.
   */
  accessToken: string;
  /** Decrypted `refresh_token_enc`. Null on Bluesky, which has nothing to refresh. */
  refreshToken: string | null;
  /** ISO 8601, or null when the credential does not expire. */
  expiresAt: string | null;
  /**
   * `social_accounts.platform_user_id`: a numeric id on X, the bare member id
   * on LinkedIn (the adapter wraps it in `urn:li:person:`), a DID on Bluesky.
   */
  platformUserId: string;
  handle: string;
  /**
   * Bluesky only, and optional: the PDS hosting this repo. Left unset by
   * `tokens.ts` — there is no column for it — and resolved from the DID
   * document at call time.
   */
  serviceEndpoint?: string | null;
};

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

/**
 * A handle on a post that already exists on a platform, in whatever form that
 * platform needs to reply to it.
 *
 * `id` is the value that belongs in `post_variants.platform_post_id`. The rest
 * is Bluesky's overhead: atproto reply refs are strong refs, meaning each one
 * carries both the record URI and its content hash, and a reply must name the
 * thread root as well as its immediate parent.
 */
export type PostRef = {
  /** AT-URI on Bluesky, tweet id on X, share URN on LinkedIn. */
  id: string;
  /** Bluesky record CID. Resolvable from `id` when absent, at the cost of a round trip. */
  cid?: string | null;
  /** Bluesky thread root. Absent means `id` is itself the root. */
  rootId?: string | null;
  rootCid?: string | null;
};

export type PublishTarget = {
  /** Post body. Callers are expected to have split to `capabilities.maxChars` already. */
  content: string;
  /** Absolute, publicly fetchable URLs. Adapters download and re-upload them. */
  mediaUrls?: string[];
  /** Ask the platform to render a card for the first link. Not all platforms obey. */
  linkPreviewEnabled?: boolean;
  /** Set to thread this post under an existing one. Null or absent posts standalone. */
  replyTo?: PostRef | null;
};

export type PublishResult = {
  platform: Platform;
  /** For `post_variants.platform_post_id`. */
  platformPostId: string;
  /** For `post_variants.platform_post_url`. Null when the platform gives us no permalink. */
  platformPostUrl: string | null;
  /** Feed straight back in as the next thread item's `replyTo`. */
  ref: PostRef;
  /** ISO 8601, taken locally — platforms do not consistently return a timestamp. */
  publishedAt: string;
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export type PlatformProfile = {
  platform: Platform;
  platformUserId: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  /** Null when the platform does not expose it at the scopes we hold. */
  followersCount: number | null;
};

/** One reply/comment on a post of ours. The raw material for keyword capture. */
export type PlatformReply = {
  /** Platform-native id of the reply itself. */
  id: string;
  authorPlatformUserId: string;
  authorHandle: string;
  authorDisplayName: string | null;
  text: string;
  createdAt: string;
  /** Enough to reply to this reply, where the platform allows it. */
  ref: PostRef;
};

export type FetchRepliesOptions = {
  /** Adapters clamp this to whatever the platform's page size allows. */
  limit?: number;
};

export type DmRecipient = {
  platformUserId: string;
  handle?: string | null;
};

export type DmResult = {
  /** ISO 8601. */
  sentAt: string;
  conversationId: string | null;
  messageId: string | null;
};

/**
 * The output of a token refresh, ready to be re-encrypted and written back.
 * `refreshToken` may come back rotated; treat a non-null value as replacing the
 * stored one.
 */
export type RefreshedToken = {
  accessToken: string;
  refreshToken: string | null;
  /** ISO 8601, or null when the new credential does not expire. */
  expiresAt: string | null;
};

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

export type PlatformAdapter = {
  platform: Platform;
  capabilities: PlatformCapabilities;

  /** Creates a post. Throws rather than returning a result it cannot substantiate. */
  publish(credentials: PlatformCredentials, target: PublishTarget): Promise<PublishResult>;

  /** The connected account's own profile. Used to confirm a connection is still live. */
  fetchProfile(credentials: PlatformCredentials): Promise<PlatformProfile>;

  /**
   * Replies to one of our posts. Present on every adapter, but adapters whose
   * `capabilities.readReplies` is false throw `PlatformUnsupportedError` — the
   * capability flag is the thing to branch on, not the method's existence.
   */
  fetchReplies(
    credentials: PlatformCredentials,
    post: PostRef,
    options?: FetchRepliesOptions
  ): Promise<PlatformReply[]>;

  /** Present only where `capabilities.dm` is true. */
  sendDm?(
    credentials: PlatformCredentials,
    recipient: DmRecipient,
    message: string
  ): Promise<DmResult>;

  /** Present only where the credential expires and can be renewed without the user. */
  refreshToken?(credentials: PlatformCredentials): Promise<RefreshedToken>;
};

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Every failure out of this directory is one of these, and every `message` is
 * safe to show a user or store in `post_variants.error_message`. Provider
 * response bodies are deliberately dropped rather than wrapped: they carry
 * internal endpoint names, quota details, and occasionally fragments of the
 * request, none of which should travel back to a browser.
 */
export class PlatformError extends Error {
  readonly platform: Platform;
  /** Stable, machine-readable. Safe to branch on and safe to log. */
  readonly code: string;

  constructor(platform: Platform, code: string, message: string) {
    super(message);
    this.name = "PlatformError";
    this.platform = platform;
    this.code = code;
  }
}

/** A credential or app registration the deployment has not been given yet. */
export class PlatformNotConfiguredError extends PlatformError {
  readonly envVar: string;

  constructor(platform: Platform, envVar: string) {
    super(
      platform,
      "not_configured",
      `${platformLabel(platform)} is not configured on this deployment (missing ${envVar})`
    );
    this.name = "PlatformNotConfiguredError";
    this.envVar = envVar;
  }
}

/** The platform can do this, but we cannot — no API, or no approved scope for it. */
export class PlatformUnsupportedError extends PlatformError {
  constructor(platform: Platform, operation: string, reason?: string) {
    super(
      platform,
      "unsupported",
      reason
        ? `${platformLabel(platform)} does not support ${operation}: ${reason}`
        : `${platformLabel(platform)} does not support ${operation}`
    );
    this.name = "PlatformUnsupportedError";
  }
}

/** The stored token is rejected. The account needs reconnecting; retrying will not help. */
export class PlatformAuthError extends PlatformError {
  constructor(platform: Platform, detail = "the connection needs to be re-authorised") {
    super(platform, "auth", `${platformLabel(platform)} rejected the stored credentials: ${detail}`);
    this.name = "PlatformAuthError";
  }
}

/** Retryable after `retryAfterSeconds`, when the platform told us how long. */
export class PlatformRateLimitError extends PlatformError {
  readonly retryAfterSeconds: number | null;

  constructor(platform: Platform, retryAfterSeconds: number | null) {
    super(platform, "rate_limited", `${platformLabel(platform)} rate limit reached, so try again later`);
    this.name = "PlatformRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Anything else the platform refused. `status` is the only provider detail kept. */
export class PlatformRequestError extends PlatformError {
  readonly status: number;

  constructor(platform: Platform, status: number, operation?: string) {
    super(
      platform,
      "request_failed",
      operation
        ? `${platformLabel(platform)} ${operation} failed (${status})`
        : `${platformLabel(platform)} request failed (${status})`
    );
    this.name = "PlatformRequestError";
    this.status = status;
  }
}

/** The call exceeded its own deadline. Distinct from a 5xx: nothing was refused. */
export class PlatformTimeoutError extends PlatformError {
  constructor(platform: Platform, timeoutMs: number) {
    super(platform, "timeout", `${platformLabel(platform)} did not respond within ${timeoutMs}ms`);
    this.name = "PlatformTimeoutError";
  }
}

/** The post cannot be represented on this platform at all — too long, empty, wrong shape. */
export class PlatformContentError extends PlatformError {
  constructor(platform: Platform, message: string) {
    super(platform, "invalid_content", message);
    this.name = "PlatformContentError";
  }
}

const PLATFORM_LABELS: Record<Platform, string> = {
  x: "X",
  linkedin: "LinkedIn",
  bluesky: "Bluesky",
};

export function platformLabel(platform: Platform): string {
  return PLATFORM_LABELS[platform];
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

/**
 * Ten seconds is long enough for any of these endpoints on a good day and short
 * enough that a stalled publish fails inside a cron tick rather than after it.
 */
export const DEFAULT_TIMEOUT_MS = 10_000;

/** Media transfers move real bytes, so they get their own, longer budget. */
export const MEDIA_TIMEOUT_MS = 30_000;

export type PlatformFetchInit = RequestInit & { timeoutMs?: number };

/**
 * `fetch` with a mandatory deadline.
 *
 * Note the `cache: "no-store"`: these are writes and authenticated reads, and
 * Next's fetch cache is opt-out, not opt-in. `lib/platforms/bluesky.ts` sets a
 * 15-minute revalidate for exactly the opposite reason — it reads public data
 * that changes slowly and belongs in the cache.
 */
export async function platformFetch(
  platform: Platform,
  url: string | URL,
  init: PlatformFetchInit = {}
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...rest, cache: "no-store", signal: controller.signal });
  } catch {
    if (controller.signal.aborted) {
      throw new PlatformTimeoutError(platform, timeoutMs);
    }
    // A DNS failure or dropped connection. The cause is not ours to relay.
    throw new PlatformRequestError(platform, 0, "connection");
  } finally {
    clearTimeout(timer);
  }
}

function retryAfterSeconds(response: Response): number | null {
  const header = response.headers.get("retry-after") ?? response.headers.get("x-rate-limit-reset");
  if (!header) return null;

  const asNumber = Number(header);
  if (Number.isFinite(asNumber)) {
    // X sends an epoch second in x-rate-limit-reset; Retry-After sends a delta.
    return asNumber > 1_000_000_000
      ? Math.max(0, Math.round(asNumber - Date.now() / 1000))
      : Math.max(0, Math.round(asNumber));
  }

  const asDate = Date.parse(header);
  return Number.isNaN(asDate) ? null : Math.max(0, Math.round((asDate - Date.now()) / 1000));
}

/** Maps a response onto the error taxonomy, then parses it. Bodies are read but never surfaced. */
export async function platformJson<T>(
  platform: Platform,
  response: Response,
  operation: string
): Promise<T> {
  if (response.ok) {
    if (response.status === 204) return undefined as T;
    try {
      return (await response.json()) as T;
    } catch {
      throw new PlatformRequestError(platform, response.status, `${operation} (unreadable response)`);
    }
  }

  // Drain the body so the connection can be reused, and discard it.
  await response.text().catch(() => "");

  if (response.status === 401) throw new PlatformAuthError(platform);
  if (response.status === 403) {
    throw new PlatformAuthError(platform, "the connection is missing a required permission");
  }
  if (response.status === 429) throw new PlatformRateLimitError(platform, retryAfterSeconds(response));

  throw new PlatformRequestError(platform, response.status, operation);
}

/** Platforms count characters, not UTF-16 units. Matches `lib/compose/thread.ts`. */
export function characterLength(text: string): number {
  return Array.from(text).length;
}

/** Guards the two content failures every adapter shares before spending a request. */
export function assertPublishable(
  platform: Platform,
  capabilities: PlatformCapabilities,
  content: string
): void {
  if (content.trim().length === 0) {
    throw new PlatformContentError(platform, "Post content is empty");
  }

  const length = characterLength(content);
  if (length > capabilities.maxChars) {
    throw new PlatformContentError(
      platform,
      `Post is ${length} characters; ${platformLabel(platform)} allows ${capabilities.maxChars}`
    );
  }
}

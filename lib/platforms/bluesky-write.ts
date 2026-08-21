/**
 * Bluesky authenticated writes.
 *
 * The counterpart to `lib/platforms/bluesky.ts`, which reads public data from
 * the AppView and deliberately stays unauthenticated. Writes cannot go there:
 * a record is created in the user's own repo, which lives on their PDS, so
 * every call here is aimed at that host with a session the user authorised.
 *
 * This is the one adapter that is complete today, because Bluesky asks for no
 * developer account, no app review, and no paid tier. The stored credential is
 * an app password (Settings -> App Passwords on bsky.app), which
 * `com.atproto.server.createSession` exchanges for a short-lived session JWT.
 * We hold the app password rather than a session because sessions last hours
 * and a scheduler runs for months.
 *
 * Handle casing: `lib/platforms/bluesky.ts` passes handles through untouched
 * because the AppView resolves them case-insensitively, while
 * `lib/rank/store.ts` lowercases so one account is one trend line. Here we
 * lowercase handles — atproto's canonical form — but never DIDs, where the
 * suffix after `did:plc:` is case-sensitive and lowercasing it resolves nothing.
 */
import {
  MEDIA_TIMEOUT_MS,
  PlatformContentError,
  PlatformRequestError,
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
} from "@/lib/platforms/types";

/** bsky.social is an entryway that fronts the PDSes it hosts, and the fallback for unresolvable DIDs. */
const DEFAULT_PDS = "https://bsky.social";
const PLC_DIRECTORY = "https://plc.directory";
/** Handle resolution only; every authenticated call goes to the member's own PDS. */
const PUBLIC_APPVIEW = "https://public.api.bsky.app/xrpc";
const POST_COLLECTION = "app.bsky.feed.post";

/** bsky.social rejects blobs over ~1MB; staying under it turns a 400 into a clear message. */
const MAX_BLOB_BYTES = 976_560;
/** The `app.bsky.embed.images` lexicon caps an embed at four. */
const MAX_IMAGES = 4;

/**
 * Sessions are good for roughly two hours. Fifty minutes is a wide margin that
 * still lets one thread publish on a single login instead of one per post.
 */
const SESSION_TTL_MS = 50 * 60 * 1000;

const CAPABILITIES: PlatformCapabilities = {
  publish: true,
  readReplies: true,
  dm: false,
  maxChars: 300,
  supportsThreads: true,
};

// ---------------------------------------------------------------------------
// PDS resolution
// ---------------------------------------------------------------------------

type DidDocument = {
  service?: Array<{ id?: string; type?: string; serviceEndpoint?: string }>;
};

/** DID documents effectively never move, so one lookup per process is plenty. */
const pdsCache = new Map<string, string>();

function didWebHost(did: string): string | null {
  const rest = did.slice("did:web:".length);
  if (!rest) return null;
  // did:web encodes path segments as colons and the port colon as %3A.
  return rest.split(":").map(decodeURIComponent).join("/");
}

async function resolvePds(credentials: PlatformCredentials): Promise<string> {
  if (credentials.serviceEndpoint) return stripTrailingSlash(credentials.serviceEndpoint);

  const did = credentials.platformUserId;
  if (!did.startsWith("did:")) return DEFAULT_PDS;

  const cached = pdsCache.get(did);
  if (cached) return cached;

  const url = did.startsWith("did:plc:")
    ? `${PLC_DIRECTORY}/${encodeURIComponent(did)}`
    : did.startsWith("did:web:")
      ? `https://${didWebHost(did)}/.well-known/did.json`
      : null;

  if (!url) return DEFAULT_PDS;

  try {
    const response = await platformFetch("bluesky", url, { headers: { accept: "application/json" } });
    if (!response.ok) return DEFAULT_PDS;
    const doc = (await response.json()) as DidDocument;
    const endpoint = doc.service?.find(
      (entry) => entry.type === "AtprotoPersonalDataServer" || entry.id === "#atproto_pds"
    )?.serviceEndpoint;
    const resolved = endpoint ? stripTrailingSlash(endpoint) : DEFAULT_PDS;
    pdsCache.set(did, resolved);
    return resolved;
  } catch {
    // A directory outage should not block publishing to a bsky.social-hosted repo.
    return DEFAULT_PDS;
  }
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Handle to DID, via the same public AppView `lib/platforms/bluesky.ts` reads.
 *
 * Only needed at connect time: once an account is stored, `platform_user_id`
 * holds the DID and this is skipped. Without it, a member on a self-hosted PDS
 * would have their sign-in attempted against bsky.social and see a credential
 * error for what is really a routing problem.
 */
async function resolveHandleToDid(handle: string): Promise<string | null> {
  const url = new URL(`${PUBLIC_APPVIEW}/com.atproto.identity.resolveHandle`);
  url.searchParams.set("handle", handle);

  try {
    const response = await platformFetch("bluesky", url, { headers: { accept: "application/json" } });
    if (!response.ok) return null;
    const data = (await response.json()) as { did?: string };
    return data.did ?? null;
  } catch {
    return null;
  }
}

/** DIDs are case-sensitive; handles are not, and lowercase is their canonical form. */
function normalizeIdentifier(value: string): string {
  const trimmed = value.trim().replace(/^@/, "");
  return trimmed.startsWith("did:") ? trimmed : trimmed.toLowerCase();
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

type Session = {
  endpoint: string;
  did: string;
  handle: string;
  accessJwt: string;
  expiresAt: number;
};

const sessionCache = new Map<string, Session>();

type CreateSessionResponse = {
  did: string;
  handle: string;
  accessJwt: string;
  refreshJwt: string;
  didDoc?: DidDocument;
};

async function session(credentials: PlatformCredentials): Promise<Session> {
  const cached = sessionCache.get(credentials.socialAccountId);
  if (cached && cached.expiresAt > Date.now()) return cached;

  const endpoint = await resolvePds(credentials);
  const identifier = normalizeIdentifier(credentials.platformUserId || credentials.handle);

  const response = await platformFetch("bluesky", `${endpoint}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ identifier, password: credentials.accessToken }),
  });

  const data = await platformJson<CreateSessionResponse>("bluesky", response, "sign-in");

  // The session's own DID document is authoritative and free — prefer it for
  // subsequent calls over whatever the directory said.
  const fromDoc = data.didDoc?.service?.find(
    (entry) => entry.type === "AtprotoPersonalDataServer" || entry.id === "#atproto_pds"
  )?.serviceEndpoint;

  const fresh: Session = {
    endpoint: fromDoc ? stripTrailingSlash(fromDoc) : endpoint,
    did: data.did,
    handle: data.handle,
    accessJwt: data.accessJwt,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  sessionCache.set(credentials.socialAccountId, fresh);
  return fresh;
}

/** Drops a cached session so the next call re-authenticates. */
function invalidateSession(socialAccountId: string): void {
  sessionCache.delete(socialAccountId);
}

async function xrpcGet<T>(
  active: Session,
  method: string,
  params: Record<string, string | string[]>,
  operation: string
): Promise<T> {
  const url = new URL(`${active.endpoint}/xrpc/${method}`);
  for (const [name, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(name, item);
    } else {
      url.searchParams.set(name, value);
    }
  }

  const response = await platformFetch("bluesky", url, {
    headers: { accept: "application/json", authorization: `Bearer ${active.accessJwt}` },
  });

  return platformJson<T>("bluesky", response, operation);
}

async function xrpcPost<T>(
  active: Session,
  method: string,
  body: unknown,
  operation: string
): Promise<T> {
  const response = await platformFetch("bluesky", `${active.endpoint}/xrpc/${method}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${active.accessJwt}`,
    },
    body: JSON.stringify(body),
  });

  return platformJson<T>("bluesky", response, operation);
}

// ---------------------------------------------------------------------------
// Rich text facets
// ---------------------------------------------------------------------------

type FacetFeature =
  | { $type: "app.bsky.richtext.facet#link"; uri: string }
  | { $type: "app.bsky.richtext.facet#tag"; tag: string };

type Facet = {
  index: { byteStart: number; byteEnd: number };
  features: FacetFeature[];
};

const encoder = new TextEncoder();

/** Facet offsets are UTF-8 byte offsets, not code-point or UTF-16 indices. */
function byteOffset(text: string, charIndex: number): number {
  return encoder.encode(text.slice(0, charIndex)).length;
}

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;
const TAG_PATTERN = /(^|\s)(#[^\s#]+)/g;
/** A trailing bracket or full stop is nearly always sentence punctuation, not part of the link. */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

/**
 * Bluesky stores no markup: a URL is plain text unless the record carries a
 * facet pointing at it, and without one the link renders unclickable. Mentions
 * are left alone on purpose — they need a handle-to-DID resolution per mention,
 * and a wrong DID silently tags a stranger.
 */
function detectFacets(text: string): Facet[] {
  const facets: Facet[] = [];

  for (const match of Array.from(text.matchAll(URL_PATTERN))) {
    const raw = match[0];
    const trimmed = raw.replace(TRAILING_PUNCTUATION, "");
    if (!trimmed) continue;
    const start = match.index ?? 0;
    facets.push({
      index: {
        byteStart: byteOffset(text, start),
        byteEnd: byteOffset(text, start + trimmed.length),
      },
      features: [{ $type: "app.bsky.richtext.facet#link", uri: trimmed }],
    });
  }

  for (const match of Array.from(text.matchAll(TAG_PATTERN))) {
    const token = match[2].replace(TRAILING_PUNCTUATION, "");
    const tag = token.slice(1);
    // A bare "#" or an all-digit tag is not a tag on Bluesky.
    if (!tag || tag.length > 64 || /^\d+$/.test(tag)) continue;
    const start = (match.index ?? 0) + match[0].indexOf("#");
    facets.push({
      index: {
        byteStart: byteOffset(text, start),
        byteEnd: byteOffset(text, start + token.length),
      },
      features: [{ $type: "app.bsky.richtext.facet#tag", tag }],
    });
  }

  return facets.sort((a, b) => a.index.byteStart - b.index.byteStart);
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

type BlobRef = Record<string, unknown>;

type UploadBlobResponse = { blob: BlobRef };

/**
 * Bluesky hosts its own media: an image has to be uploaded to the PDS as a blob
 * and embedded by reference, so the URL in `post_variants.media_urls` is
 * fetched here and re-uploaded rather than linked.
 */
async function uploadImage(active: Session, mediaUrl: string): Promise<BlobRef> {
  const source = await platformFetch("bluesky", mediaUrl, {
    headers: { accept: "image/*" },
    timeoutMs: MEDIA_TIMEOUT_MS,
  });

  if (!source.ok) {
    throw new PlatformContentError("bluesky", "An attached image could not be downloaded");
  }

  const contentType = source.headers.get("content-type") ?? "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    throw new PlatformContentError("bluesky", "Attachments must be images");
  }

  const bytes = new Uint8Array(await source.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new PlatformContentError("bluesky", "An attached image was empty");
  }
  if (bytes.byteLength > MAX_BLOB_BYTES) {
    throw new PlatformContentError(
      "bluesky",
      `Images must be under ${Math.floor(MAX_BLOB_BYTES / 1024)}KB on Bluesky`
    );
  }

  const response = await platformFetch("bluesky", `${active.endpoint}/xrpc/com.atproto.repo.uploadBlob`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": contentType,
      authorization: `Bearer ${active.accessJwt}`,
    },
    body: bytes,
    timeoutMs: MEDIA_TIMEOUT_MS,
  });

  const data = await platformJson<UploadBlobResponse>("bluesky", response, "image upload");
  return data.blob;
}

// ---------------------------------------------------------------------------
// Strong refs
// ---------------------------------------------------------------------------

type PostView = {
  uri: string;
  cid: string;
  author?: { did?: string; handle?: string; displayName?: string; avatar?: string };
  record?: { text?: string; createdAt?: string; reply?: { root?: { uri?: string; cid?: string } } };
  replyCount?: number;
};

type StrongRef = { uri: string; cid: string };

/**
 * An atproto reply names both the record URI and its CID. We only persist the
 * URI (`post_variants.platform_post_id` is one column), so a ref that arrives
 * without a CID gets one back from the network.
 */
async function strongRef(active: Session, uri: string, cid: string | null | undefined): Promise<StrongRef> {
  if (cid) return { uri, cid };

  const data = await xrpcGet<{ posts?: PostView[] }>(
    active,
    "app.bsky.feed.getPosts",
    { uris: uri },
    "post lookup"
  );

  const found = data.posts?.[0];
  if (!found?.cid) {
    throw new PlatformRequestError("bluesky", 404, "post lookup");
  }
  return { uri: found.uri, cid: found.cid };
}

function rkeyOf(uri: string): string {
  return uri.split("/").pop() ?? "";
}

function postUrl(handle: string, uri: string): string {
  return `https://bsky.app/profile/${handle}/post/${rkeyOf(uri)}`;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

type PostRecord = {
  $type: typeof POST_COLLECTION;
  text: string;
  createdAt: string;
  langs?: string[];
  facets?: Facet[];
  reply?: { root: StrongRef; parent: StrongRef };
  embed?: { $type: string; images: Array<{ alt: string; image: BlobRef }> };
};

async function publish(
  credentials: PlatformCredentials,
  target: PublishTarget
): Promise<PublishResult> {
  assertPublishable("bluesky", CAPABILITIES, target.content);

  const active = await session(credentials);

  const record: PostRecord = {
    $type: POST_COLLECTION,
    text: target.content,
    createdAt: new Date().toISOString(),
  };

  const facets = detectFacets(target.content);
  if (facets.length > 0) record.facets = facets;

  if (target.replyTo) {
    const parent = await strongRef(active, target.replyTo.id, target.replyTo.cid);
    const root = target.replyTo.rootId
      ? await strongRef(active, target.replyTo.rootId, target.replyTo.rootCid)
      : parent;
    record.reply = { root, parent };
  }

  const mediaUrls = (target.mediaUrls ?? []).slice(0, MAX_IMAGES);
  if (mediaUrls.length > 0) {
    const images = await Promise.all(mediaUrls.map((url) => uploadImage(active, url)));
    record.embed = {
      $type: "app.bsky.embed.images",
      // Alt text is not modelled on post_variants yet; an empty string is the
      // lexicon's required-but-blank value, not a claim that the image has none.
      images: images.map((image) => ({ alt: "", image })),
    };
  }

  // `linkPreviewEnabled` is not honoured here. An external embed card needs the
  // link's Open Graph metadata plus a thumbnail uploaded as a blob; until that
  // exists, links are facet-linked and render as plain clickable text.

  const created = await xrpcPost<{ uri: string; cid: string }>(
    active,
    "com.atproto.repo.createRecord",
    { repo: active.did, collection: POST_COLLECTION, record },
    "publish"
  );

  const ref: PostRef = {
    id: created.uri,
    cid: created.cid,
    rootId: record.reply?.root.uri ?? created.uri,
    rootCid: record.reply?.root.cid ?? created.cid,
  };

  return {
    platform: "bluesky",
    platformPostId: created.uri,
    platformPostUrl: postUrl(active.handle, created.uri),
    ref,
    publishedAt: record.createdAt,
  };
}

async function fetchProfile(credentials: PlatformCredentials): Promise<PlatformProfile> {
  const active = await session(credentials);

  const data = await xrpcGet<{
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
    followersCount?: number;
  }>(active, "app.bsky.actor.getProfile", { actor: active.did }, "profile lookup");

  return {
    platform: "bluesky",
    platformUserId: data.did,
    handle: data.handle,
    displayName: data.displayName ?? null,
    avatarUrl: data.avatar ?? null,
    followersCount: data.followersCount ?? null,
  };
}

type ThreadNode = {
  $type?: string;
  post?: PostView;
  replies?: ThreadNode[];
};

async function fetchReplies(
  credentials: PlatformCredentials,
  post: PostRef,
  options: FetchRepliesOptions = {}
): Promise<PlatformReply[]> {
  const active = await session(credentials);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);

  const data = await xrpcGet<{ thread?: ThreadNode }>(
    active,
    "app.bsky.feed.getPostThread",
    // Depth 1 is the post's direct replies. Nested conversation is not what
    // keyword capture wants — a reply to a reply is not a reply to us.
    { uri: post.id, depth: "1", parentHeight: "0" },
    "reply lookup"
  );

  const replies = data.thread?.replies ?? [];
  const root = post.rootId ?? post.id;
  const rootCid = post.rootCid ?? post.cid ?? null;

  return replies
    .map((node) => node.post)
    .filter((view): view is PostView => Boolean(view?.uri && view.author?.did))
    .slice(0, limit)
    .map((view) => ({
      id: view.uri,
      authorPlatformUserId: view.author?.did ?? "",
      authorHandle: view.author?.handle ?? "",
      authorDisplayName: view.author?.displayName ?? null,
      text: view.record?.text ?? "",
      createdAt: view.record?.createdAt ?? new Date().toISOString(),
      ref: {
        id: view.uri,
        cid: view.cid,
        rootId: view.record?.reply?.root?.uri ?? root,
        rootCid: view.record?.reply?.root?.cid ?? rootCid,
      },
    }));
}

/**
 * Bluesky's adapter, complete.
 *
 * No `sendDm`: `chat.bsky.convo` exists but only delivers to accounts that have
 * opted into messages from strangers, so an automation built on it would fail
 * silently for most recipients. `capabilities.dm` is false to match.
 *
 * No `refreshToken`: an app password does not expire. It is revoked, not
 * renewed, and a revoked one surfaces as `PlatformAuthError` at sign-in.
 */
export const blueskyAdapter: PlatformAdapter = {
  platform: "bluesky",
  capabilities: CAPABILITIES,
  publish,
  fetchProfile,
  fetchReplies,
};

/** Exported for the connection flow: proves an app password works before it is stored. */
export async function verifyAppPassword(
  identifier: string,
  appPassword: string
): Promise<PlatformProfile> {
  const normalized = normalizeIdentifier(identifier);
  const did = normalized.startsWith("did:") ? normalized : await resolveHandleToDid(normalized);

  const probe: PlatformCredentials = {
    // Not a stored account yet, so the cache key is scoped to this attempt.
    socialAccountId: `probe:${normalized}`,
    platform: "bluesky",
    accessToken: appPassword,
    refreshToken: null,
    expiresAt: null,
    platformUserId: did ?? normalized,
    handle: normalized,
  };

  try {
    return await fetchProfile(probe);
  } finally {
    invalidateSession(probe.socialAccountId);
  }
}

/** Escape hatch for the token layer: forget a cached session after credentials change. */
export function forgetBlueskySession(socialAccountId: string): void {
  invalidateSession(socialAccountId);
}

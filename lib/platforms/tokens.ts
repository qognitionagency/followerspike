/**
 * Credential resolution for connected accounts.
 *
 * `social_accounts` stores tokens encrypted, so nothing can call a platform
 * without going through here first. The job of this module is narrow: read the
 * row, decrypt, refresh if the token is about to expire, write the new one
 * back, and hand the adapter a `PlatformCredentials`. Adapters never touch the
 * database and this module never makes a platform call except through an
 * adapter's `refreshToken`.
 *
 * Refreshing *before* expiry rather than reacting to a 401 matters for X, where
 * tokens live two hours and a thread can take longer than the margin to
 * publish. Refreshing at the last moment means the third post in a thread gets
 * a token that died between requests.
 */
import { db } from "@/lib/db";
import { forgetBlueskySession } from "@/lib/platforms/bluesky-write";
import { getAdapter } from "@/lib/platforms/registry";
import { PlatformAuthError, type PlatformCredentials } from "@/lib/platforms/types";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";
import type { Platform, SocialAccount } from "@/lib/types/db";

/**
 * Renew anything expiring inside this window. Wide enough to cover a slow
 * thread publish, narrow enough that a normal token is not churned every run.
 */
const REFRESH_MARGIN_MS = 10 * 60 * 1000;

export class SocialAccountNotFoundError extends Error {
  constructor(identifier: string) {
    super(`No connected account found for ${identifier}`);
    this.name = "SocialAccountNotFoundError";
  }
}

// ---------------------------------------------------------------------------
// Row reads
// ---------------------------------------------------------------------------

export async function getSocialAccount(socialAccountId: string): Promise<SocialAccount | null> {
  const sql = db();
  const rows = await sql`
    select id, workspace_id, user_id, platform, platform_user_id, handle, display_name,
           avatar_url, access_token_enc, refresh_token_enc, token_expires_at, scopes,
           is_active, last_synced_at, created_at
    from social_accounts
    where id = ${socialAccountId}
    limit 1
  `;

  return (rows[0] as SocialAccount | undefined) ?? null;
}

/** Active connections for a workspace, optionally narrowed to one platform. */
export async function listSocialAccounts(
  workspaceId: string,
  platform?: Platform
): Promise<SocialAccount[]> {
  const sql = db();
  const rows = platform
    ? await sql`
        select id, workspace_id, user_id, platform, platform_user_id, handle, display_name,
               avatar_url, access_token_enc, refresh_token_enc, token_expires_at, scopes,
               is_active, last_synced_at, created_at
        from social_accounts
        where workspace_id = ${workspaceId} and platform = ${platform} and is_active
        order by created_at asc
      `
    : await sql`
        select id, workspace_id, user_id, platform, platform_user_id, handle, display_name,
               avatar_url, access_token_enc, refresh_token_enc, token_expires_at, scopes,
               is_active, last_synced_at, created_at
        from social_accounts
        where workspace_id = ${workspaceId} and is_active
        order by platform asc, created_at asc
      `;

  return rows as SocialAccount[];
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export type TokenSet = {
  accessToken: string;
  refreshToken?: string | null;
  /** ISO 8601, or null when the credential does not expire. */
  expiresAt?: string | null;
};

/**
 * Encrypts and stores a token set. Used by the OAuth callback on first connect
 * and by the refresh path below; both go through one function so a plaintext
 * token can never reach an `update` statement by a route that forgot.
 */
export async function storeTokens(socialAccountId: string, tokens: TokenSet): Promise<void> {
  const sql = db();
  const accessTokenEnc = encryptSecret(tokens.accessToken);
  const refreshTokenEnc = tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null;

  await sql`
    update social_accounts
    set access_token_enc = ${accessTokenEnc},
        refresh_token_enc = coalesce(${refreshTokenEnc}, refresh_token_enc),
        token_expires_at = ${tokens.expiresAt ?? null},
        is_active = true
    where id = ${socialAccountId}
  `;

  // Bluesky caches a live session keyed by account; new credentials invalidate it.
  forgetBlueskySession(socialAccountId);
}

/**
 * Marks a connection dead. Called when a token is rejected outright, so the
 * scheduler stops retrying a credential only the user can fix.
 */
export async function markNeedsReconnect(socialAccountId: string): Promise<void> {
  const sql = db();
  await sql`update social_accounts set is_active = false where id = ${socialAccountId}`;
  forgetBlueskySession(socialAccountId);
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

function expiresWithinMargin(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const at = Date.parse(expiresAt);
  if (Number.isNaN(at)) return false;
  return at - Date.now() <= REFRESH_MARGIN_MS;
}

function toCredentials(account: SocialAccount): PlatformCredentials {
  if (!account.access_token_enc) {
    throw new PlatformAuthError(account.platform, "no token is stored for this connection");
  }

  return {
    socialAccountId: account.id,
    platform: account.platform,
    accessToken: decryptSecret(account.access_token_enc),
    refreshToken: account.refresh_token_enc ? decryptSecret(account.refresh_token_enc) : null,
    expiresAt: account.token_expires_at,
    platformUserId: account.platform_user_id,
    handle: account.handle,
  };
}

/**
 * Refreshes in flight, keyed by account.
 *
 * X rotates its refresh token on every use, so two concurrent refreshes for one
 * account leave the loser holding a token the platform has already invalidated.
 * This collapses concurrent callers inside a single process. It does not help
 * across serverless instances — the durable fix is a conditional update or an
 * advisory lock, and it belongs here when the scheduler starts running more
 * than one worker.
 */
const inFlight = new Map<string, Promise<PlatformCredentials>>();

async function refreshCredentials(
  account: SocialAccount,
  credentials: PlatformCredentials
): Promise<PlatformCredentials> {
  const adapter = getAdapter(account.platform);

  if (!adapter.refreshToken) {
    // Bluesky lands here: an app password does not expire, so a non-null
    // expiry on that row is bad data rather than something to act on.
    return credentials;
  }

  try {
    const refreshed = await adapter.refreshToken(credentials);
    await storeTokens(account.id, {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: refreshed.expiresAt,
    });

    return {
      ...credentials,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: refreshed.expiresAt,
    };
  } catch (error) {
    if (error instanceof PlatformAuthError) {
      // The refresh token itself is dead; only the user can fix this.
      await markNeedsReconnect(account.id);
    }
    throw error;
  }
}

/** Decrypts, refreshes if due, and returns credentials ready to hand an adapter. */
export async function credentialsForAccount(account: SocialAccount): Promise<PlatformCredentials> {
  if (!account.is_active) {
    throw new PlatformAuthError(account.platform, "the connection is disabled and needs reconnecting");
  }

  const credentials = toCredentials(account);
  if (!expiresWithinMargin(account.token_expires_at)) return credentials;

  const existing = inFlight.get(account.id);
  if (existing) return existing;

  const pending = refreshCredentials(account, credentials).finally(() => {
    inFlight.delete(account.id);
  });

  inFlight.set(account.id, pending);
  return pending;
}

/** The common entry point: id in, usable credentials out. */
export async function getPlatformCredentials(socialAccountId: string): Promise<PlatformCredentials> {
  const account = await getSocialAccount(socialAccountId);
  if (!account) throw new SocialAccountNotFoundError(socialAccountId);
  return credentialsForAccount(account);
}

/** Convenience for automations that key off workspace and platform, not account id. */
export async function getPlatformCredentialsFor(
  workspaceId: string,
  platform: Platform
): Promise<PlatformCredentials> {
  const [account] = await listSocialAccounts(workspaceId, platform);
  if (!account) throw new SocialAccountNotFoundError(`${platform} in workspace ${workspaceId}`);
  return credentialsForAccount(account);
}

import { db, databaseConfigured } from "@/lib/db";
import { encryptSecret } from "@/lib/security/encryption";
import type { Platform, SocialAccount } from "@/lib/types/db";
import type { PlatformProfile } from "@/lib/platforms/types";

/**
 * Writing a connected account down.
 *
 * `social_accounts` has carried encrypted-token columns since the v2 migration
 * with nothing ever writing to them, which is why no account could be connected
 * and therefore why nothing could publish. This is the only writer.
 *
 * Tokens are encrypted before they reach Postgres, always — `access_token_enc`
 * and `refresh_token_enc` never hold plaintext, and nothing here returns a
 * token to a caller.
 */

export type ConnectedAccount = Omit<SocialAccount, "access_token_enc" | "refresh_token_enc"> & {
  /** Whether a credential is stored, without exposing it. */
  has_credentials: boolean;
};

/**
 * Stores or refreshes one connection.
 *
 * Upserts on `(user_id, platform, platform_user_id)`: reconnecting the same
 * account has to refresh its credentials rather than error or leave a second
 * row, and re-activating is part of that — a previously disconnected account
 * reconnects instead of colliding.
 */
export async function saveConnection(input: {
  workspaceId: string;
  userId: string;
  profile: PlatformProfile;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  scopes?: string[];
}): Promise<string | null> {
  if (!databaseConfigured()) return null;

  const sql = db();
  const rows = await sql`
    insert into social_accounts (
      workspace_id, user_id, platform, platform_user_id, handle, display_name, avatar_url,
      access_token_enc, refresh_token_enc, token_expires_at, scopes, is_active, last_synced_at
    )
    values (
      ${input.workspaceId},
      ${input.userId},
      ${input.profile.platform},
      ${input.profile.platformUserId},
      ${input.profile.handle},
      ${input.profile.displayName},
      ${input.profile.avatarUrl},
      ${encryptSecret(input.accessToken)},
      ${input.refreshToken ? encryptSecret(input.refreshToken) : null},
      ${input.expiresAt ?? null},
      ${input.scopes ?? []},
      true,
      now()
    )
    on conflict (user_id, platform, platform_user_id) do update set
      workspace_id = excluded.workspace_id,
      handle = excluded.handle,
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      access_token_enc = excluded.access_token_enc,
      refresh_token_enc = coalesce(excluded.refresh_token_enc, social_accounts.refresh_token_enc),
      token_expires_at = excluded.token_expires_at,
      scopes = excluded.scopes,
      is_active = true,
      last_synced_at = now()
    returning id
  `;

  return (rows[0]?.id as string) ?? null;
}

/**
 * Everything connected in a workspace, without the secrets.
 *
 * Selects columns explicitly rather than `select *` so a token cannot reach a
 * component by accident — this feeds a page.
 */
export async function listConnections(workspaceId: string): Promise<ConnectedAccount[]> {
  if (!databaseConfigured()) return [];

  const sql = db();
  return (await sql`
    select
      id, workspace_id, user_id, platform, platform_user_id, handle, display_name,
      avatar_url, token_expires_at, scopes, is_active, last_synced_at, created_at,
      (access_token_enc is not null) as has_credentials
    from social_accounts
    where workspace_id = ${workspaceId}
    order by created_at asc
  `) as unknown as ConnectedAccount[];
}

/**
 * Disconnects an account without deleting it.
 *
 * The row is kept because published posts, captured leads and log entries all
 * reference it; deleting would either cascade that history away or break the
 * references. Clearing the credentials is what actually revokes our access, and
 * `is_active = false` is what hides it from the composer.
 */
export async function disconnectAccount(input: {
  workspaceId: string;
  accountId: string;
}): Promise<boolean> {
  if (!databaseConfigured()) return false;

  const sql = db();
  const rows = await sql`
    update social_accounts
    set is_active = false, access_token_enc = null, refresh_token_enc = null, token_expires_at = null
    where id = ${input.accountId} and workspace_id = ${input.workspaceId}
    returning id
  `;
  return rows.length > 0;
}

/** Active connections only — what the composer may actually publish through. */
export async function activeConnections(workspaceId: string): Promise<ConnectedAccount[]> {
  const all = await listConnections(workspaceId);
  return all.filter((account) => account.is_active && account.has_credentials);
}

/** One active account for a platform, for a publish path that was given only a platform. */
export async function activeAccountFor(
  workspaceId: string,
  platform: Platform
): Promise<ConnectedAccount | null> {
  const active = await activeConnections(workspaceId);
  return active.find((account) => account.platform === platform) ?? null;
}

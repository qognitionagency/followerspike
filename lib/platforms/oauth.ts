/**
 * The authorization-code half of connecting X and LinkedIn.
 *
 * `lib/platforms/x.ts` and `lib/platforms/linkedin.ts` already knew how to
 * *refresh* a token and how to publish with one. What was missing was the step
 * that produces the first token: sending the member to the platform's consent
 * screen and exchanging the code it hands back. Without it, `social_accounts`
 * could only ever hold a Bluesky app password, which is why X and LinkedIn
 * showed as unavailable on /app/accounts.
 *
 * This module is deliberately separate from the adapters. An adapter's job is
 * to act as an already-connected account; this is the one-time handshake that
 * creates one, and it is the only code that ever sees an authorization code.
 *
 * Neither platform works without a registered application. That is not a
 * limitation of this code: a user token cannot be issued without a client id,
 * and X gates write scopes behind a paid API tier while LinkedIn gates
 * `w_member_social` behind app review.
 */
import { createHash, randomBytes } from "crypto";
import { optionalEnv } from "@/lib/env";
import { PlatformNotConfiguredError, PlatformUnsupportedError } from "@/lib/platforms/types";
import type { Platform } from "@/lib/types/db";

/** The two platforms that connect over OAuth. Bluesky uses an app password instead. */
export type OAuthPlatform = "x" | "linkedin";

export function isOAuthPlatform(value: string): value is OAuthPlatform {
  return value === "x" || value === "linkedin";
}

type ProviderConfig = {
  authorizeEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  /**
   * X requires PKCE and rejects an exchange without a verifier. LinkedIn does
   * not support it and rejects the extra parameters, so this cannot be turned
   * on globally.
   */
  usesPkce: boolean;
  /**
   * X authenticates the token exchange with HTTP Basic and forbids the secret
   * in the body; LinkedIn expects it in the body and has no Basic support.
   */
  tokenAuth: "basic" | "body";
};

const PROVIDERS: Record<OAuthPlatform, ProviderConfig> = {
  x: {
    authorizeEndpoint: "https://x.com/i/oauth2/authorize",
    tokenEndpoint: "https://api.x.com/2/oauth2/token",
    // offline.access is what makes a refresh token be issued. Without it the
    // connection dies silently two hours after it is made.
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    clientIdEnv: "X_CLIENT_ID",
    clientSecretEnv: "X_CLIENT_SECRET",
    usesPkce: true,
    tokenAuth: "basic",
  },
  linkedin: {
    // openid/profile give the member id and name through /v2/userinfo, which is
    // what fetchProfile reads. w_member_social is the one that allows posting.
    authorizeEndpoint: "https://www.linkedin.com/oauth/v2/authorization",
    tokenEndpoint: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["openid", "profile", "w_member_social"],
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
    usesPkce: false,
    tokenAuth: "body",
  },
};

export function oauthConfigured(platform: Platform): boolean {
  if (platform === "bluesky") return true;
  if (!isOAuthPlatform(platform)) return false;
  const config = PROVIDERS[platform];
  return Boolean(optionalEnv(config.clientIdEnv) && optionalEnv(config.clientSecretEnv));
}

function credentialsFor(platform: OAuthPlatform): { clientId: string; clientSecret: string } {
  const config = PROVIDERS[platform];
  const clientId = optionalEnv(config.clientIdEnv);
  if (!clientId) throw new PlatformNotConfiguredError(platform, config.clientIdEnv);
  const clientSecret = optionalEnv(config.clientSecretEnv);
  if (!clientSecret) throw new PlatformNotConfiguredError(platform, config.clientSecretEnv);
  return { clientId, clientSecret };
}

/** The redirect the platform sends the member back to. Must match the app registration exactly. */
export function redirectUriFor(platform: OAuthPlatform, origin: string): string {
  return `${origin.replace(/\/+$/, "")}/api/connect/${platform}/callback`;
}

// ---------------------------------------------------------------------------
// PKCE and state
// ---------------------------------------------------------------------------

/** URL-safe random, used for both the state value and the PKCE verifier. */
function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function createState(): string {
  return randomToken();
}

export function createCodeVerifier(): string {
  return randomToken(48);
}

function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

// ---------------------------------------------------------------------------
// Step 1: send the member to the consent screen
// ---------------------------------------------------------------------------

export function buildAuthorizationUrl(params: {
  platform: OAuthPlatform;
  redirectUri: string;
  state: string;
  codeVerifier: string;
}): string {
  const config = PROVIDERS[params.platform];
  const { clientId } = credentialsFor(params.platform);

  const url = new URL(config.authorizeEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", config.scopes.join(" "));
  url.searchParams.set("state", params.state);

  if (config.usesPkce) {
    url.searchParams.set("code_challenge", codeChallenge(params.codeVerifier));
    url.searchParams.set("code_challenge_method", "S256");
  }

  return url.toString();
}

// ---------------------------------------------------------------------------
// Step 2: exchange the code for tokens
// ---------------------------------------------------------------------------

export type ExchangedTokens = {
  accessToken: string;
  refreshToken: string | null;
  /** ISO 8601, or null when the platform did not say. */
  expiresAt: string | null;
  scopes: string[];
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

export async function exchangeAuthorizationCode(params: {
  platform: OAuthPlatform;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<ExchangedTokens> {
  const config = PROVIDERS[params.platform];
  const { clientId, clientSecret } = credentialsFor(params.platform);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: clientId,
  });

  if (config.usesPkce) body.set("code_verifier", params.codeVerifier);
  if (config.tokenAuth === "body") body.set("client_secret", clientSecret);

  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json",
  };
  if (config.tokenAuth === "basic") {
    headers.authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  }

  const response = await fetch(config.tokenEndpoint, { method: "POST", headers, body });
  const data = (await response.json().catch(() => ({}))) as TokenResponse;

  if (!response.ok || !data.access_token) {
    // The platform's own description is the only useful part; the code itself
    // is a secret and never appears here.
    const detail = data.error_description || data.error || `HTTP ${response.status}`;
    throw new Error(`${params.platform} token exchange failed: ${detail}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
    scopes: data.scope ? data.scope.split(/[\s,]+/).filter(Boolean) : config.scopes,
  };
}

/** Guards a platform string from a route param before anything else touches it. */
export function requireOAuthPlatform(value: string): OAuthPlatform {
  if (!isOAuthPlatform(value)) {
    throw new PlatformUnsupportedError(
      "bluesky",
      "OAuth connect",
      `${value} does not connect over OAuth`
    );
  }
  return value;
}

/**
 * Step two of connecting an X or LinkedIn account.
 *
 * The platform sends the member back here with a code. This validates the state
 * against the cookie the start route set, exchanges the code for tokens, reads
 * the profile they belong to, and stores the connection.
 *
 * `saveConnection` encrypts before writing, so no token reaches Postgres in
 * plaintext and none is ever returned to the browser. The only thing the member
 * sees is a redirect back to /app/accounts with a status.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeAuthorizationCode,
  isOAuthPlatform,
  oauthConfigured,
  redirectUriFor,
} from "@/lib/platforms/oauth";
import { getAdapter } from "@/lib/platforms/registry";
import { saveConnection } from "@/lib/platforms/connect";
import { canConnectAccount } from "@/lib/entitlements";
import { requireAppSession } from "@/lib/session";
import { requireWorkspace } from "@/lib/workspace";
import { recordError } from "@/lib/observability/log";
import { appUrl } from "@/lib/env";
import type { PlatformCredentials } from "@/lib/platforms/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { platform: string } };

function back(request: Request, status: string, platform?: string) {
  const url = new URL("/app/accounts", request.url);
  url.searchParams.set("connect", status);
  if (platform) url.searchParams.set("platform", platform);
  return NextResponse.redirect(url);
}

export async function GET(request: Request, context: RouteContext) {
  const platform = context.params.platform;
  if (!isOAuthPlatform(platform) || !oauthConfigured(platform)) {
    return back(request, "unsupported");
  }

  const url = new URL(request.url);
  const jar = cookies();
  const stateCookie = jar.get(`oauth_state_${platform}`)?.value;
  const verifierCookie = jar.get(`oauth_verifier_${platform}`)?.value;

  // Whatever happens next, this handshake is spent. Clearing first means an
  // error path cannot leave a replayable verifier behind.
  const clear = () => {
    jar.delete({ name: `oauth_state_${platform}`, path: `/api/connect/${platform}` });
    jar.delete({ name: `oauth_verifier_${platform}`, path: `/api/connect/${platform}` });
  };

  // The member declined, or the platform refused. Not an error worth recording.
  const denied = url.searchParams.get("error");
  if (denied) {
    clear();
    return back(request, denied === "access_denied" ? "declined" : "error", platform);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // The CSRF check. A callback whose state does not match the cookie this
  // browser was issued is not a callback for a handshake this browser started,
  // and acting on it would connect an attacker's account to a victim's session.
  if (!code || !state || !stateCookie || !verifierCookie || state !== stateCookie) {
    clear();
    return back(request, "invalid_state", platform);
  }

  try {
    const session = await requireAppSession();
    const { workspace } = await requireWorkspace(session);

    // Re-checked after the round trip: the seat could have been taken by
    // another tab while the member was on the consent screen.
    const seat = await canConnectAccount(workspace.id, session.subscriptionTier);
    if (!seat.allowed) {
      clear();
      return back(request, "no_seats", platform);
    }

    const tokens = await exchangeAuthorizationCode({
      platform,
      code,
      redirectUri: redirectUriFor(platform, appUrl()),
      codeVerifier: verifierCookie,
    });

    // The adapter's own profile reader, so the handle and display name are
    // resolved the same way here as on every later sync. It needs a bearer
    // token and nothing else; the row this will become does not exist yet,
    // which is why the identifying fields are still empty.
    const provisional: PlatformCredentials = {
      socialAccountId: "",
      platform,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      platformUserId: "",
      handle: "",
    };
    const profile = await getAdapter(platform).fetchProfile(provisional);

    await saveConnection({
      workspaceId: workspace.id,
      userId: session.userId,
      profile,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
    });

    clear();
    return back(request, "connected", platform);
  } catch (error) {
    clear();
    await recordError(error, {
      source: "api/connect/callback",
      kind: "connect_failed",
      requestPath: `/api/connect/${platform}/callback`,
      context: { platform },
    });
    return back(request, "error", platform);
  }
}

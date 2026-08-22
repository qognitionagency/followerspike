/**
 * Step one of connecting an X or LinkedIn account.
 *
 * Mints a state value and a PKCE verifier, parks both in short-lived httpOnly
 * cookies, and redirects to the platform's consent screen. The callback route
 * is the only reader of those cookies.
 *
 * This is a GET because it is the target of a link the member clicks, but it is
 * still a state-changing entry point, so it re-authorizes rather than trusting
 * that the page linking to it was gated.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  buildAuthorizationUrl,
  createCodeVerifier,
  createState,
  isOAuthPlatform,
  oauthConfigured,
  redirectUriFor,
} from "@/lib/platforms/oauth";
import { canConnectAccount } from "@/lib/entitlements";
import { requireAppSession } from "@/lib/session";
import { requireWorkspace } from "@/lib/workspace";
import { recordError } from "@/lib/observability/log";
import { appUrl } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ten minutes is longer than any consent screen takes and short enough that an
 * abandoned attempt does not leave a usable verifier lying in the browser.
 */
const HANDSHAKE_TTL_SECONDS = 600;

type RouteContext = { params: { platform: string } };

export async function GET(request: Request, context: RouteContext) {
  const platform = context.params.platform;

  if (!isOAuthPlatform(platform)) {
    return NextResponse.redirect(new URL("/app/accounts?connect=unsupported", request.url));
  }

  if (!oauthConfigured(platform)) {
    // No registered app, so there is no consent screen to send anyone to.
    return NextResponse.redirect(new URL(`/app/accounts?connect=unconfigured&platform=${platform}`, request.url));
  }

  try {
    const session = await requireAppSession();
    const { workspace } = await requireWorkspace(session);

    // Checked here rather than only on the callback: sending someone through a
    // platform's consent screen and then refusing the connection wastes their
    // time and leaves an authorized app they have to revoke by hand.
    const seat = await canConnectAccount(workspace.id, session.subscriptionTier);
    if (!seat.allowed) {
      return NextResponse.redirect(new URL("/app/accounts?connect=no_seats", request.url));
    }

    const state = createState();
    const codeVerifier = createCodeVerifier();
    const redirectUri = redirectUriFor(platform, appUrl());

    const jar = cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: appUrl().startsWith("https://"),
      sameSite: "lax" as const,
      path: `/api/connect/${platform}`,
      maxAge: HANDSHAKE_TTL_SECONDS,
    };
    // sameSite lax rather than strict on purpose: the callback arrives as a
    // top-level navigation from the platform's domain, and strict would omit
    // the cookies on exactly that request.
    jar.set(`oauth_state_${platform}`, state, cookieOptions);
    jar.set(`oauth_verifier_${platform}`, codeVerifier, cookieOptions);

    return NextResponse.redirect(buildAuthorizationUrl({ platform, redirectUri, state, codeVerifier }));
  } catch (error) {
    await recordError(error, {
      source: "api/connect/start",
      kind: "authorize_failed",
      requestPath: `/api/connect/${platform}/start`,
      context: { platform },
    });
    return NextResponse.redirect(new URL("/app/accounts?connect=error", request.url));
  }
}

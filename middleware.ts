import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Everything the marketing site and the free tools serve to a signed-out visitor.
 *
 * This list no longer decides what is *protected*, only what is definitely
 * public. Protection is decided by `isProtectedRoute` below, and the difference
 * matters: while an unlisted path meant "send them to login", every URL that did
 * not exist answered 307 to /login instead of 404, and so did
 * `/opengraph-image`, which meant every social unfurl of this site fetched a
 * login page instead of the card.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/how-it-works",
  "/linkedin-autopilot",
  "/linkedin-profile-audit",
  "/linkedin-ghostwriter",
  "/login(.*)",
  "/signup(.*)",
  "/trust",
  "/security",
  "/privacy",
  "/terms",
  "/dpa",
  "/subprocessors",
  "/site-map",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  // Next generates these from app/opengraph-image.tsx and app/icon.svg. They are
  // fetched by crawlers with no session, and are the whole point of having a
  // social card.
  "/opengraph-image",
  "/icon.svg",
  "/apple-icon",
  "/tools(.*)",
  "/features(.*)",
  "/free-tools(.*)",
  "/blog(.*)",
  "/roles(.*)",
  "/industries(.*)",
  "/icp(.*)",
  "/compare(.*)",
  "/api/free-tools(.*)",
  "/api/webhooks(.*)",
  // Signed by QStash rather than carrying a Clerk session. Clerk would reject
  // the scheduler outright, so the signature check inside each handler is the
  // only gate — the same posture the Razorpay webhook has.
  "/api/cron(.*)",
  "/api/jobs(.*)",
]);

/**
 * The routes that actually require a session.
 *
 * Every page underneath these re-authorizes on its own: `/app` through
 * `requireAppSession` in its layout, `/admin` through the `is_admin` check in
 * its own, and every server action independently of either. Middleware is
 * defence in depth and the thing that produces a friendly redirect, not the only
 * gate, which is what makes it safe for anything unmatched to fall through to
 * Next rather than being swept into /login.
 */
const isProtectedRoute = createRouteMatcher(["/app(.*)", "/dashboard(.*)", "/admin(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  const isApi = request.nextUrl.pathname.startsWith("/api/");

  // Not protected and not an API route: a marketing page, a generated metadata
  // route, or a URL that does not exist. Let Next answer, so a dead link gets
  // the 404 page instead of a redirect to a login form it never needed.
  if (!isProtectedRoute(request) && !isApi) {
    return;
  }

  const { userId } = await auth();
  if (userId) {
    return;
  }

  // An API caller wants a status code, not a login page.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirecting explicitly rather than calling auth.protect(): protect() infers
  // the sign-in URL from Clerk configuration and answers 404 when it cannot
  // resolve one, which is what every protected route did in production while
  // working locally. This also preserves the original destination.
  const loginUrl = new URL("/login", request.url);
  // A path, not an absolute URL: this value is echoed back as a redirect target
  // after sign-in, so keeping it relative means it can never point off-site.
  loginUrl.searchParams.set("redirect_url", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: [
    // Skip Next internals and static files, but always run on API routes.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

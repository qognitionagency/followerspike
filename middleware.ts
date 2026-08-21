import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Everything the marketing site and the free tools need to serve to a signed-out
 * visitor. Anything not listed here requires a Clerk session.
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

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
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

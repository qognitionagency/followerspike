import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Everything the marketing site and the free tools need to serve to a signed-out
 * visitor. Anything not listed here requires a Clerk session.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
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
  "/api/cron(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files, but always run on API routes.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

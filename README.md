# FollowerSpike

FollowerSpike is a LinkedIn growth autopilot SaaS for founders, SMB owners, coaches, consultants, creators, and personal brands.

One-liner: "Grow your LinkedIn account on autopilot: posts, likes, comments, connections, and follow-up DMs handled daily."

## Stack

- Next.js App Router with TypeScript strict mode
- Clerk authentication and Neon serverless Postgres, accessed only from server code
- Razorpay subscriptions and signed webhooks
- Configurable AI generation with provider fallback
- Upstash QStash cron dispatch
- Transactional audit lead email
- Separate Playwright worker service for live execution
- Static marketing content layer for feature pages, free tools, blog posts, roles, industries, ICP pages, and comparisons

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Fill database, AI, billing, queue, email, worker, and session encryption values.
3. Install dependencies with `npm install`.
4. Run the app with `npm run dev`.
5. Seed SEO pages with `npm run seed:seo`.

## Production Integration Notes

- AI: set the provider API key and model values from `.env.example`. Keep the fallback provider configured before enabling production generation.
- Email: set the transactional email API key and a verified sender. Free audit emails use an idempotency key per audit lead so duplicate form retries do not double-send.
- Razorpay: create USD monthly and annual subscription plans in Razorpay, then set the six `RAZORPAY_PLAN_*_USD` values. Razorpay supports international subscription currencies, while settlement handling depends on your Razorpay account configuration.
- Database: Neon serverless Postgres is the only datastore. Set `DATABASE_URL` to the pooled connection string and apply `db/migrations/*.sql` in filename order with `psql "$DATABASE_URL" -f <file>`.
- Auth: Clerk. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. `users.clerk_user_id` joins the Clerk identity to the local `users` row, which is provisioned on first sign-in by `lib/session.ts`; every other table keys off the local uuid.
- Spike Rank: the Bluesky ranker reads Bluesky's public AppView and needs no credentials. Rank history is stored in `profile_scores`; without `DATABASE_URL` a rank still returns but nothing is recorded. Smoke-test with `npm run rank:smoke -- yourname.bsky.social`.
- Tests: `npm run test:e2e` runs the Playwright suite against a production build — public pages, nav links, auth boundaries, and the free-tool funnel.

## Safety Positioning

FollowerSpike is not affiliated with, endorsed by, or certified by LinkedIn. Live automation can carry platform risk. The product is built with explicit consent, review mode, conservative limits, action windows, encryption, audit logs, and auto-pause controls designed to reduce risk.

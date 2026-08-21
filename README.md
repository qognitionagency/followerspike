# FollowerSpike

FollowerSpike is a three-platform founder OS for X, LinkedIn, and Bluesky, aimed at founders, SMB owners, coaches, consultants, creators, and personal brands.

One-liner: "Post to X, LinkedIn, and Bluesky in your own voice — and turn the reach into subscribers."

## Stack

- Next.js App Router with TypeScript strict mode
- Clerk authentication and Neon serverless Postgres, accessed only from server code
- Razorpay subscriptions and signed webhooks
- Configurable AI generation with provider fallback
- Upstash QStash cron dispatch, with a Postgres-backed job queue and recurring-work sweep
- Post-publish automations: first comment, auto-plug, cross-post relay, keyword capture, evergreen recycling
- Transactional email for audit leads and captured-lead delivery
- Platform adapters for X, LinkedIn, and Bluesky (Bluesky publishes today; X and LinkedIn need an OAuth app)
- Static marketing content layer for feature pages, free tools, blog posts, roles, industries, ICP pages, and comparisons

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Fill database, AI, billing, queue, email, and session encryption values.
3. Install dependencies with `pnpm install`.
4. Run the app with `pnpm dev`.
5. Apply migrations with `pnpm db:migrate` (`pnpm db:status` lists what is pending).

## Production Integration Notes

- AI: set the provider API key and model values from `.env.example`. Keep the fallback provider configured before enabling production generation.
- Email: set the transactional email API key and a verified sender. Free audit emails use an idempotency key per audit lead so duplicate form retries do not double-send.
- Razorpay: create USD monthly and annual subscription plans, then set all six `RAZORPAY_PLAN_*_USD` values. `pnpm billing:plans` reports which plans exist and which are missing, and `pnpm billing:plans -- --create` creates the missing ones at the amounts in `lib/constants.ts`; creating is behind a flag because a Razorpay plan cannot be deleted once made. There is no fallback between plans — a missing plan id fails the checkout rather than charging a different tier's price. Razorpay supports international subscription currencies, while settlement handling depends on your account configuration.
- Database: Neon serverless Postgres is the only datastore. Set `DATABASE_URL` to the pooled connection string and apply migrations with `pnpm db:migrate`, which records each file in `schema_migrations`. Applying a file by hand with `psql "$DATABASE_URL" -f <file>` still works but leaves no record — which is how two migrations were once committed, deployed, and never applied.
- Auth: Clerk. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. `users.clerk_user_id` joins the Clerk identity to the local `users` row, which is provisioned on first sign-in by `lib/session.ts`; every other table keys off the local uuid.
- Spike Rank: the Bluesky ranker reads Bluesky's public AppView and needs no credentials. Rank history is stored in `profile_scores`; without `DATABASE_URL` a rank still returns but nothing is recorded. Smoke-test with `pnpm rank:smoke -- yourname.bsky.social`.
- Tests: `pnpm test:e2e` runs the Playwright suite against a production build — public pages, nav links, auth boundaries, the free-tool funnel, the safety gate's timezone and quiet-hour logic, automation config parsing and keyword matching, and billing (plan resolution, webhook signatures, tier normalisation). A live Razorpay checkout is deliberately not automated.

## Safety Positioning

FollowerSpike is not affiliated with, endorsed by, or certified by LinkedIn, X, or Bluesky. Publishing on someone's behalf carries platform risk. Every automated action passes `lib/automation/safety.ts` first, which enforces explicit consent, a current consent version, quiet hours in the user's timezone, per-tier daily caps, auto-pause after repeated failures, and a global kill switch. Claims on `/trust` and `/security` are kept to what that gate actually enforces.

FollowerSpike does not automate likes, follows, connection requests, or direct messages, and does not act on anyone else's posts. Automations only reply under posts the account published and read the replies to them, through each platform's official API. Every automation is off by default and simulates by default; a simulating automation records what it would have done and does nothing else. Where a platform has no endpoint for a feature — LinkedIn exposes neither comment reading nor messaging at the permissions available to us — it is shown as unsupported rather than offered and quietly skipped.

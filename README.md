# FollowerSpike

FollowerSpike is a LinkedIn growth autopilot SaaS for founders, SMB owners, coaches, consultants, creators, and personal brands.

One-liner: "Grow your LinkedIn account on autopilot: posts, likes, comments, connections, and follow-up DMs handled daily."

## Stack

- Next.js App Router with TypeScript strict mode
- Supabase Auth, Postgres, RLS, and service-role server flows
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
- Database: the project is migrating from Supabase Postgres to Neon. Set `DATABASE_URL` to the pooled Neon connection string and apply the SQL in `supabase/migrations` with `psql "$DATABASE_URL" -f <file>`. The migrations are plain Postgres and are not Supabase-specific despite the directory name. Note only 5 of the 13 tables the code uses have migrations checked in; the other 8 (`users`, `posts`, `connections`, `comments`, `automation_log`, `target_leaders`, `system_settings`, `user_daily_usage`) still live only in the Supabase project and must be dumped before the cutover can finish.
- Spike Rank: the Bluesky ranker reads Bluesky's public AppView and needs no credentials, so it works with no setup. Rank history lands in `spike_rank_snapshots` on Neon and requires `DATABASE_URL`; without it a rank still returns but nothing is recorded. Smoke-test it with `npm run rank:smoke -- yourname.bsky.social`.

## Safety Positioning

FollowerSpike is not affiliated with, endorsed by, or certified by LinkedIn. Live automation can carry platform risk. The product is built with explicit consent, review mode, conservative limits, action windows, encryption, audit logs, and auto-pause controls designed to reduce risk.

# FollowerSpike

FollowerSpike is a LinkedIn autopilot SaaS for founders, CEOs, consultants, and executives.

One-liner: "Your LinkedIn presence on autopilot — relevant posts, comments, and connections, daily."

## Stack

- Next.js App Router with TypeScript strict mode
- Supabase Auth, Postgres, RLS, and service-role server flows
- Razorpay subscriptions and signed webhooks
- Gemini 2.5 Pro primary AI with DeepSeek fallback
- Upstash QStash cron dispatch
- Resend audit lead drip email
- Separate Playwright worker service for live execution

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Fill Supabase, AI, Razorpay, QStash, Resend, worker, and session encryption values.
3. Install dependencies with `npm install`.
4. Run the app with `npm run dev`.
5. Seed SEO pages with `npm run seed:seo`.

## Safety Positioning

FollowerSpike is not affiliated with, endorsed by, or certified by LinkedIn. Live automation can carry platform risk. The product is built with explicit consent, review mode, conservative limits, action windows, encryption, audit logs, and auto-pause controls designed to reduce risk.

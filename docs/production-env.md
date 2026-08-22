# Production environment variables

What production is missing, ordered by what it costs you to leave it missing.
Checked against `vercel env`, which currently holds only `DATABASE_URL`, the
Clerk keys, and `SESSION_ENCRYPTION_KEY`.

Set these in the Vercel dashboard under Settings → Environment Variables, scoped
to **Production** (and Preview where noted). Redeploy after adding them:
environment variables are read at build time for anything prerendered.

---

## 1. Read this one first: analytics is currently off

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-NZJYJ25CW4` |

The measurement id used to be hardcoded in `app/layout.tsx`, which meant every
local `pnpm dev` page load and every preview deployment reported into the
production property. It is now read from this variable, and **the analytics
scripts are not rendered at all while it is unset**. Set it in Production only,
and deliberately leave it empty in Preview and Development so those stop
polluting your numbers.

## 2. Free, and fixes indexing

| Variable | Value |
| --- | --- |
| `APP_URL` | `https://www.followerspike.com` (your real custom domain, no trailing slash) |

Not strictly required any more. `appUrl()` in `lib/env.ts` now falls back to
Vercel's own `VERCEL_PROJECT_PRODUCTION_URL`, so canonicals and the sitemap are
correct without it. But that fallback is a `*.vercel.app` host, and that is the
origin search engines would be told to index. Set this to the domain you
actually want ranked.

## 3. Every AI path is dead without these

| Variable | Notes |
| --- | --- |
| `GEMINI_API_KEY` | Primary provider |
| `GEMINI_MODEL` | `gemini-3-pro-preview` |
| `DEEPSEEK_API_KEY` | Fallback provider |

Unset, these return `503 no_provider_configured` and every generation path
fails closed by design: the free tools, profile audits, relevance scoring, voice
synthesis, and the composer's draft panel. Nothing returns canned text, so an
outage is visible rather than silently producing filler under a member's name.

## 4. No email is being sent

| Variable | Notes |
| --- | --- |
| `RESEND_API_KEY` | |
| `RESEND_FROM_EMAIL` | e.g. `FollowerSpike <audit@followerspike.com>` — the domain must be verified in Resend |
| `RESEND_REPLY_TO_EMAIL` | Optional |

Without these, lead-magnet delivery and the keyword-capture automation collect
addresses and then deliver nothing.

## 5. Checkout cannot complete

| Variable | Notes |
| --- | --- |
| `RAZORPAY_KEY_ID` | |
| `RAZORPAY_KEY_SECRET` | |
| `RAZORPAY_WEBHOOK_SECRET` | Also add the webhook endpoint in Razorpay: `https://<domain>/api/webhooks/razorpay` |
| `RAZORPAY_PLAN_STARTER_MONTHLY_USD` | |
| `RAZORPAY_PLAN_STARTER_ANNUAL_USD` | |
| `RAZORPAY_PLAN_PRO_MONTHLY_USD` | |
| `RAZORPAY_PLAN_PRO_ANNUAL_USD` | |
| `RAZORPAY_PLAN_AGENCY_MONTHLY_USD` | |
| `RAZORPAY_PLAN_AGENCY_ANNUAL_USD` | |

All six plan ids are required. There is no fallback — a missing id throws rather
than charging the wrong amount, which is what the retired fallback did when it
mapped Agency onto the Pro plan id.

Run `pnpm billing:plans` to see which plans exist in the account, and
`pnpm billing:plans -- --create` to create the missing ones from the amounts in
`lib/constants.ts`. The script refuses to accept a plan whose price no longer
matches the pricing page.

The webhook is also the **only** writer of subscription state, including
cancellations. Until `RAZORPAY_WEBHOOK_SECRET` is set, a member can click cancel
and Razorpay will honour it, but the local `subscriptions` row will never update.

## 6. Nothing publishes on a schedule

| Variable | Notes |
| --- | --- |
| `QSTASH_TOKEN` | Needed to publish messages; without it the dispatcher runs claimed jobs inline |
| `QSTASH_CURRENT_SIGNING_KEY` | |
| `QSTASH_NEXT_SIGNING_KEY` | |

The two signing keys are what authorize `/api/cron/dispatch` and
`/api/jobs/run`. With neither set, both routes answer 401 to everything — which
is deliberate, since an unsigned job runner would be publicly executable, but it
also means no scheduled publish, no evergreen refill, and no Spike Rank refresh
happens in production today.

Also create the QStash schedule itself, pointing at
`https://<domain>/api/cron/dispatch`.

## 7. Clerk is on a development instance

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Must be `pk_live_…` |
| `CLERK_SECRET_KEY` | Must be `sk_live_…` |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk Dashboard → Webhooks → Signing Secret |

`pk_test`/`sk_test` keys belong to a Clerk *development* instance and are not
valid on a custom domain. Create a production instance, point it at the domain,
and swap both keys. The webhook keeps the Neon `users` row in sync when a Clerk
email changes or a user is deleted; without it those drift apart silently.

## 8. Optional: X and LinkedIn account connection

| Variable | Notes |
| --- | --- |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | |
| `LINKEDIN_API_VERSION` | e.g. `202506` |

The OAuth connect flow is built and waiting at
`/api/connect/<platform>/start`. Both platforms stay hidden on `/app/accounts`
until their client id and secret exist, so there is no broken button in the
meantime.

Register these callback URLs exactly, on the custom domain:

    https://<domain>/api/connect/x/callback
    https://<domain>/api/connect/linkedin/callback

Scopes requested are `tweet.read tweet.write users.read offline.access` on X and
`openid profile w_member_social` on LinkedIn.

**Two approval gates that no amount of configuration gets around:** X requires a
paid API tier for write access, and LinkedIn requires app review before it will
grant `w_member_social`. Bluesky needs none of this — it connects with a
per-user app password today.

## 9. Already fine, listed for completeness

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Set. Use the pooled Neon connection string |
| `SESSION_ENCRYPTION_KEY` | Set. This is what encrypts stored access tokens — rotating it orphans every connected account |
| `AUTOMATION_GLOBAL_PAUSED` | Defaults to `false`. The kill switch, also togglable from `/admin` |

---

## Also worth doing

- **Set the CI secrets.** `.github/workflows/ci.yml` runs the signed-out e2e
  project only when `E2E_CLERK_PUBLISHABLE_KEY`, `E2E_CLERK_SECRET_KEY` and
  `E2E_DATABASE_URL` are present. They are not set, so e2e currently skips on
  every pull request.
- **Give e2e its own database.** `E2E_DATABASE_URL` should not be the production
  string. The signed-in project writes to whatever database it points at.
- **Create a Neon dev branch.** Local `.env.local` and production still share one
  database, so a migration run locally is a production migration. That is worth
  fixing before the user count is above one.

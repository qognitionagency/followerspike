# CLAUDE.md

Working notes for Claude Code in this repo. Keep this file current — it is the
first thing read in a new session.

## Repo location — read first

This repo lives at **`~/dev/followerspike`**, deliberately NOT in
`~/Documents/GitHub/`. That path is inside iCloud Drive, and with the disk near
full macOS evicted file contents there: `stat` reported the real size while the
file read as empty, `.git/HEAD` and `.git/config` included, which broke git
entirely. Check `stat -f '%Sf' <file>` for a `dataless` flag before believing
any "corruption". `brctl download` does not bring the bytes back. Do not move
this repo back under `~/Documents`.

The old checkout there was deleted on 2026-08-21 after being confirmed fully
represented on the remote.

## What this is

FollowerSpike is a Next.js App Router SaaS. It is mid-pivot: the original
product was LinkedIn browser automation (a Playwright worker driving likes,
comments, connection requests, DMs). **v2 is a three-platform founder OS** for
X, LinkedIn, and Bluesky — voice-modelled post generation, Spike Rank, and a
review queue. The LinkedIn automation engine was retired; the v2 publishing
path that replaced it is built and working.

## Stack

- Next.js 14 App Router, React 18, TypeScript strict
- Clerk for auth; Neon serverless Postgres for everything else
- Tailwind v4 + shadcn/ui in `components/ui`
- Razorpay subscriptions, Resend transactional email, Gemini/DeepSeek AI
- Playwright for e2e (`e2e/`)

## Commands

**pnpm is the package manager — never `npm` or `yarn`.** `package.json` pins it
via `packageManager`, and `pnpm.onlyBuiltDependencies` lists the packages
allowed to run install scripts (pnpm 10 blocks them by default; Tailwind's
`@tailwindcss/oxide` and `esbuild` break without it). Add to that list rather
than running `pnpm approve-builds` interactively.

    pnpm dev              # local dev
    pnpm build            # production build
    pnpm lint             # clean; needs next/core-web-vitals AND next/typescript
    pnpm exec tsc --noEmit   # typecheck — currently clean
    pnpm db:status        # which migrations are applied vs pending
    pnpm db:migrate       # apply pending migrations, recording each one
    pnpm jobs:tick -- --once   # drive the job queue locally, no QStash needed
    pnpm rank:smoke -- yourname.bsky.social
    pnpm test:e2e         # Playwright, needs a prod build

`pnpm test:e2e` runs two projects. `--project="signed-out"` needs only a Clerk
publishable key and `DATABASE_URL`. `--project="signed-in"` additionally needs
`CLERK_SECRET_KEY` and `E2E_CLERK_USER_ID` (the `users.clerk_user_id` of the
test account), and it **writes to whatever database it points at**.

## Invariants — do not break these

- Neon and Clerk are server-only. Never import `lib/db.ts` or read secrets from
  a client component.
- **Apply migrations with `pnpm db:migrate`, not bare `psql`.** `schema_migrations`
  is the ledger and the script is its only writer. This exists because it was
  missing: `20260821120000_workspaces.sql` and `20260821130000_jobs.sql` were
  committed, deployed, and never applied, so every signed-in page queried a
  `workspace_id` column that did not exist. Applying by hand still works but
  leaves no record, which is exactly how that happened. Never edit an applied
  migration; add a new one.
- `users.clerk_user_id` is the join key to Clerk. Every other table keys off
  the local `users.id` uuid. `lib/session.ts` provisions the row on first
  sign-in and claims a pre-seeded row only when the Clerk email is *verified*.
- `workspaces` is the ownership boundary. There is no RLS (Neon exposes no
  PostgREST endpoint), so `where workspace_id = ...` on every query *is* the
  access control. Scope through `requireWorkspace`, never through a workspace id
  from a request body.
- Publishing goes through the queue and nothing else. `publish_variant` claims a
  variant with `where platform_post_id is null`, which is the only thing keeping
  a retry from posting twice under a user's name. A second publisher would be a
  second place for that to be wrong.
- Every automated action passes `lib/automation/safety.ts` first. Claims on
  `/trust`, `/security` and `README.md` are kept to what that gate enforces.
- `comments`, `connections`, and `target_leaders` are deliberately gone. Do not
  reintroduce them — they belong to the retired automation product.
- Middleware redirects unauthenticated traffic explicitly rather than via
  `auth.protect()`, and the redirect target must stay relative (there is an
  e2e test asserting no open redirect).
- Voice profiles are never written from a failed AI call. `lib/voice/synthesize.ts`
  returns the typed failure instead of a neutral profile on purpose: a canned
  profile does not look broken, it just makes every future post sound like
  somebody else under the user's real name.

## Environments

**Local `.env.local` and production point at the same Neon database.** There is
no dev branch. A migration run locally is a production migration, and the
signed-in e2e project writes to production data. Worth fixing with a Neon
branch before the user count is above one.

`vercel env` shows production has `DATABASE_URL`, Clerk, and
`SESSION_ENCRYPTION_KEY` only — see "Not configured in production" below.

## What actually works today

- Marketing site: features, pricing, blog, roles, industries, ICP, compares,
  legal/trust pages, `llms.txt`, sitemap
- Free tools: Spike Rank (Bluesky, public AppView, no credentials), thread
  splitter, LinkedIn profile audit from pasted text, lead capture + email
- Signed-in shell at `/app`: dashboard, composer, queue, accounts, voice,
  evergreen, growth plan, settings incl. Razorpay checkout
- Account connection: Bluesky connects for real with an app password; X and
  LinkedIn show as unavailable until an OAuth app exists
- Publishing: composer → per-platform variants → queue → `publish_variant`
- Job queue: Postgres-backed, QStash-signed dispatch, lease reaping, backoff
- Safety gate: global pause, account pause, consent, error streak, quiet hours,
  per-tier daily caps, per-automation caps
- Voice: interview, synthesis, versioned profiles, calibration stats, pgvector
  exemplar retrieval
- `/admin`: kill switch, users, leads, activity log
- Privacy: data export and account deletion routes
- Webhooks: Clerk (user sync) and Razorpay (signature-verified)

## Todo

Roughly priority-ordered. Check items off here as they land.

### Correctness / hygiene
- [ ] Reconcile the rest of the marketing copy with the retired engine. `/trust`,
      `/security` and `README.md` are done, but the homepage,
      `/linkedin-autopilot`, `/tools/[slug]` and `/icp` still sell "likes,
      comments, connection requests, and follow-up DMs" as things the product
      does daily. None of that is built. This is roadmap copy presented as
      current capability.
- [ ] `next.config.mjs` sets `output: "standalone"`, which Vercel does not need
      and which makes `pnpm start` warn that it is not serving the standalone
      build. Harmless today; drop it unless something deploys by container.
- [ ] Nav "Overview" still points at the homepage. Fine as-is, but if it should
      be a distinct page, that is the last anchor-style entry in the menu.

### v2 features
- [x] ~~Social account connection flow~~ — `/app/accounts`, `lib/platforms/connect.ts`
- [x] ~~Publishing path~~ — `/app/composer` + `publish_variant`
- [x] ~~Scheduler/dispatch~~ — `/api/cron/dispatch`, `/api/jobs/run`, `pnpm jobs:tick`
- [x] ~~Per-tier daily limits and auto-pause~~ — `lib/automation/safety.ts` and
      `lib/automation/usage.ts`, wired into `publish.ts`
- [x] ~~`ai_generations`~~ — every AI call is logged with provider, model, tokens, cost
- [x] ~~Voice pipeline~~ — `lib/voice/` owns the profile shape, the interview,
      versioned `voice_profiles`, `voice_calibrations`, and `voice_embeddings`
      similarity search over pgvector
- [x] ~~`evergreen_items`~~ — `/app/evergreen` plus the `evergreen_refill` handler,
      which schedules through the composer rather than publishing itself
- [x] ~~`growth_plan_items`~~ — `/app/growth` builds a plan from the latest
      `profile_scores` row and nothing else
- [ ] Voice calibration is recorded but never consumed. `recentEdits()` exists to
      feed a regeneration; nothing calls it yet, so the profile does not actually
      improve from corrections.
- [ ] The composer does not use the voice profile. `similarExemplars()` is built
      and indexed but no generator passes a voice into its prompt.
- [ ] Job kinds still registered with null handlers: `auto_plug`, `first_comment`,
      `cross_post_relay`, `lead_poll`, `deliver_lead_email`, `rank_refresh`.
      Pro tier sells the first three by name.
- [ ] Nothing schedules `evergreen_refill` on a cadence — it only fires from the
      "Queue one now" button.

### Not configured in production
Checked against `vercel env`: production has `DATABASE_URL`, Clerk, and
`SESSION_ENCRYPTION_KEY` only.
- [ ] `GEMINI_API_KEY` / `DEEPSEEK_API_KEY` — every AI generation path is dead
      in prod, including the free tools and the whole voice synthesis flow
- [ ] `RESEND_API_KEY` — no transactional email is being sent
- [ ] `RAZORPAY_*` — checkout cannot complete in production
- [ ] `QSTASH_*` — the dispatcher fails closed without signing keys, so nothing
      publishes on a schedule in production yet

### Billing / ops
- [ ] Create the six `RAZORPAY_PLAN_*_USD` plans for the current
      $19/$39/$79 ladder and set them in prod. `lib/billing/razorpay.ts` falls
      back to the retired Essentials/Growth env vars; drop those once no live
      subscription references them.
- [ ] Verify subscription lifecycle end to end (checkout → webhook → tier
      change → downgrade/cancel). No e2e coverage exists for billing today.
- [ ] Production Clerk instance. `pk_test`/`sk_test` keys are a dev instance and
      will not work on the custom domain.
- [x] ~~CI~~ — `.github/workflows/ci.yml` runs typecheck, lint and build on every
      PR, and the signed-out e2e project when the repo secrets
      (`E2E_CLERK_PUBLISHABLE_KEY`, `E2E_CLERK_SECRET_KEY`, `E2E_DATABASE_URL`)
      are set. Those secrets are not configured yet, so e2e currently skips.

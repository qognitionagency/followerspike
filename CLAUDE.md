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
    pnpm billing:plans    # report the six Razorpay plans; --create makes missing ones
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
- **An automation's `dry_run` is decided in its own handler, not by the safety
  gate.** The gate only reads `dry_run` when it is handed an `automationId`, and
  the replies and relays these automations produce publish as ordinary
  `publish_variant` jobs that carry none. Every handler in `lib/jobs/` that acts
  on behalf of an automation therefore checks `dry_run` itself before writing
  anything. Miss that check and a "simulating" automation posts for real.
- A reply queued by `first_comment` or `auto_plug` passes `as: "comments"` in its
  publish payload, so it spends the comment allowance rather than the post one.
  The pricing page sells those as separate caps.
- Automations are triggered from `lib/jobs/followups.ts`, which runs after a
  successful publish and only for `thread_order` 0 — item 3 of a thread is not a
  second post to plug. It never throws into `publishVariant`: by then the post is
  live, and failing the job would retry a publish that already happened.
- `comments`, `connections`, and `target_leaders` are deliberately gone. Do not
  reintroduce them — they belong to the retired automation product.
- Middleware redirects unauthenticated traffic explicitly rather than via
  `auth.protect()`, and the redirect target must stay relative (there is an
  e2e test asserting no open redirect).
- **Never read `process.env.APP_URL` directly. Use `appUrl()` from `lib/env.ts`.**
  Fourteen files each had their own `process.env.APP_URL || "http://localhost:3000"`,
  and APP_URL is not set in production, so every canonical tag, Open Graph url,
  sitemap entry, robots host and JSON-LD id told the world the site lived at
  localhost. `appUrl()` falls back through `VERCEL_PROJECT_PRODUCTION_URL` and
  `VERCEL_URL` before localhost, so a Vercel deployment is right with no
  configuration at all.
- Icons come from `components/icons.tsx`, not a package. It is generated from
  lucide's own path data, so the glyphs are unchanged; `lucide-react` and
  `motion` are no longer dependencies and should not come back.
- Anything public that costs money passes `lib/security/rate-limit.ts` first.
  `/api/free-tools/[slug]` is unauthenticated and runs an AI generation per
  call, which had no ceiling at all before. The limiter is Postgres-backed and
  fails open, so a database outage degrades limits rather than the tools.
- Failures are recorded with `recordError` from `lib/observability/log.ts`
  before a handler returns a generic status. There was no error tracking of any
  kind; every catch block returned a 502 and dropped the detail.
- Voice profiles are never written from a failed AI call. `lib/voice/synthesize.ts`
  returns the typed failure instead of a neutral profile on purpose: a canned
  profile does not look broken, it just makes every future post sound like
  somebody else under the user's real name.

## Environments

**Local `.env.local` and production still point at the same Neon database.**
There is no dev branch yet. A migration run locally is a production migration,
and the signed-in e2e project writes to production data.

`docs/database-environments.md` is the runbook for splitting them; it needs the
Neon console. Until that is done, set `PRODUCTION_DATABASE_HOST` in
`.env.local` and `pnpm db:migrate` will refuse to touch production without
`-- --production`. `--status` is never blocked, and the guard is inert when the
variable is unset or when `CI`/`VERCEL` is set.

`vercel env` shows production has `DATABASE_URL`, Clerk, and
`SESSION_ENCRYPTION_KEY` only — see "Not configured in production" below.

## What actually works today

- Marketing site: features, pricing, blog, roles, industries, ICP, compares,
  legal/trust pages, `llms.txt`, sitemap
- Free tools: Spike Rank (Bluesky, public AppView, no credentials), thread
  splitter, LinkedIn profile audit from pasted text, lead capture + email
- Signed-in shell at `/app`: dashboard, composer, queue, accounts, voice,
  evergreen, growth plan, settings incl. Razorpay checkout
- Account connection: Bluesky with an app password; X and LinkedIn over OAuth
  2 at `/api/connect/[platform]/start` and `/callback` (PKCE on X, state-cookie
  CSRF check on both). Both stay hidden until their client id and secret exist
- Publishing: composer → per-platform variants → queue → `publish_variant`
- Job queue: Postgres-backed, QStash-signed dispatch, lease reaping, backoff
- Safety gate: global pause, account pause, consent, error streak, quiet hours,
  per-tier daily caps, per-automation caps
- Voice: interview, synthesis, versioned profiles, calibration stats, pgvector
  exemplar retrieval
- Automations at `/app/automations`: first comment, auto-plug, cross-post relay,
  keyword capture with email delivery, and an evergreen cadence. Each is off and
  simulating by default, and every decision lands in `automation_log`
- Cadences: `lib/jobs/schedule.ts` sweeps on every dispatcher tick and enqueues
  evergreen refills and a weekly Spike Rank refresh, keyed per period
- `/admin`: kill switch, users, leads, activity log
- Privacy: data export, account deletion, and one-click subscription cancel
  at the end of the paid period (`lib/billing/subscription.ts`)
- Rate limiting and an error log, both in Postgres, pruned on the dispatcher
  tick. `/admin/errors` is the read side
- Webhooks: Clerk (user sync) and Razorpay (signature-verified)

## Todo

Roughly priority-ordered. Check items off here as they land.

### Correctness / hygiene
- [x] ~~Reconcile the rest of the marketing copy with the retired engine~~ — done
      across `/pricing`, `/linkedin-ghostwriter`, `/free-tools`, `/blog`,
      `/blog/[slug]`, `app/llms.txt`, `lib/marketing/content.ts` and
      `lib/marketing/free-tools.ts`. Every surviving mention of likes, follows,
      connection requests or DMs is now an explicit denial. Two blog posts were
      repurposed rather than deleted, keeping their slugs. Found on the way: the
      pricing hero was quoting $9/$29/$49 for the three deleted tiers against a
      real ladder of $19/$39/$79.
- [x] ~~Nav "Overview"~~ — removed; it pointed where the logo already points.
      `lib/marketing/content.ts` also carried a second, unimported copy of
      `marketingNav` that had already drifted (different prices). Deleted.
      `lib/marketing/nav.ts` is the only nav.
- Historical, for context. Previously done:
      `/trust`, `/security`, `README.md`, the homepage, `/linkedin-autopilot`,
      `/tools/[slug]` (via `lib/seo.ts`, which generates ~1,300 pages from one
      template) and `/icp`. Still selling likes, comments, connection requests
      or follow-up DMs as current capability: `/pricing`,
      `/linkedin-ghostwriter`, `/free-tools`, `/blog` and `/blog/[slug]`,
      `app/llms.txt`, and the `featurePages`/`comparisonPages`/blog entries in
      `lib/marketing/content.ts` plus `lib/marketing/free-tools.ts`.
- [x] ~~`next.config.mjs` `output: "standalone"`~~ — dropped, along with the
      `picsum.photos` remote image pattern and the `motion` transpile entry.
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
- [x] ~~Voice calibration is never consumed~~ — it always was:
      `lib/voice/generate.ts` calls `recentEdits()` and `renderCorrections()`
      puts the edits in the prompt. It only *looked* unconsumed because nothing
      could reach `generateInVoice` until the composer panel was rendered.
- [x] ~~The composer does not use the voice profile~~ — `generateInVoice` and the
      discard/calibration actions were already wired server-side; only the panel
      was missing from `ComposerForm`'s JSX, which is why `pnpm lint` was failing
      on twelve unused symbols. The panel now renders.
- [x] ~~Job kinds with null handlers~~ — all six run: `first_comment` and
      `auto_plug` in `lib/jobs/reply.ts`, `cross_post_relay` in
      `lib/jobs/relay.ts`, `lead_poll` and `deliver_lead_email` in
      `lib/jobs/leads.ts`, `rank_refresh` in `lib/jobs/rank.ts`. Configured at
      `/app/automations`, backed by `lib/automations/store.ts`
- [x] ~~Nothing schedules `evergreen_refill` on a cadence~~ —
      `lib/jobs/schedule.ts`, swept by the dispatcher and by `pnpm jobs:tick`
- [x] ~~`auto_dm` is a value of `automations.kind`~~ — dropped from the check
      constraint in `20260822140000_drop_auto_dm_kind.sql` and from
      `AutomationKind`. The product promises on /trust and /pricing that it never
      sends a DM, so the kind was a schema-level contradiction of a published
      claim. **`lib/platforms/x.ts` still carries a working `sendDm` with no
      caller.** Removed: the method, the `dm` capability flag, and the
      `DmRecipient`/`DmResult` types are all gone, so no adapter can send a
      direct message. `lib/platforms/types.ts` records why. Git history has the
      X implementation if the product ever genuinely changes.
- [x] ~~`thread_drip`, `source_watcher` and `lead_followup` have no handler~~ —
      dropped in `20260822170000_drop_unbuilt_automation_kinds.sql`.
      `AutomationKind`, `IMPLEMENTED_AUTOMATION_KINDS` and the check constraint
      are now the same five values. **Add a kind to all three in the same change
      that adds its handler**; the e2e test asserts each offerable kind reaches a
      registered handler, through the automation-kind to job-kind mapping.
- [x] ~~X has no scorer at all~~ — `lib/rank/x.ts` scores a pasted X profile on
      the same five pillars, with cadence and engagement reported `unknown` and
      excluded from the total. This was not just a gap: `spike-rank-x` had a
      slug, a page and a nav entry badged "New", but `runFreeTool` had no branch
      for it, so it silently returned the generic positioning writeup with no
      score. Three e2e tests now cover it.
- [ ] `rank_refresh` still only scores Bluesky on a schedule. X and LinkedIn both
      need pasted text, so neither can be refreshed unattended.

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
- [x] ~~Drop the retired Essentials/Growth plan fallbacks~~ — verified first that
      `subscriptions` is empty in production, so nothing referenced them. The old
      fallback mapped Agency onto `RAZORPAY_PLAN_PRO_MONTHLY_USD`, so a
      half-configured deployment charged $39 for a $79 plan; a missing plan id
      now throws instead. `normalizeSubscriptionTier` still maps the old tier
      *names*, which is about existing rows rather than checkout
- [ ] Create the six `RAZORPAY_PLAN_*_USD` plans and set them in prod. Needs the
      Razorpay account: run `pnpm billing:plans` to see what is missing, then
      `-- --create`. Amounts come from `PRICING`, and the script refuses to agree
      with a plan whose price no longer matches the pricing page
- [x] ~~e2e coverage for billing~~ — `e2e/billing.spec.ts` covers plan
      resolution, webhook signatures, the endpoint's refusal of unsigned
      requests, tier normalisation, and entitlement ordering. A live checkout is
      deliberately not automated; `pnpm billing:plans` covers the account side
- [ ] Production Clerk instance. `pk_test`/`sk_test` keys are a dev instance and
      will not work on the custom domain.
- [x] ~~CI~~ — `.github/workflows/ci.yml` runs typecheck, lint and build on every
      PR, and the signed-out e2e project when the repo secrets
      (`E2E_CLERK_PUBLISHABLE_KEY`, `E2E_CLERK_SECRET_KEY`, `E2E_DATABASE_URL`)
      are set. Those secrets are not configured yet, so e2e currently skips.

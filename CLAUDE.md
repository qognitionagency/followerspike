# CLAUDE.md

Working notes for Claude Code in this repo. Keep this file current — it is the
first thing read in a new session.

## Repo location — read first

This repo lives at **`~/dev/followerspike`**, deliberately NOT in
`~/Documents/GitHub/`. That path is inside iCloud Drive, and with the disk near
full macOS evicted file contents there: `stat` reported the real size while the
file read as empty, `.git/HEAD` and `.git/config` included, which broke git
entirely. Check `stat -f '%Sf' <file>` for a `dataless` flag before believing
any "corruption". Do not move this repo back under `~/Documents`.

## What this is

FollowerSpike is a Next.js App Router SaaS. It is mid-pivot: the original
product was LinkedIn browser automation (a Playwright worker driving likes,
comments, connection requests, DMs). **v2 is a three-platform founder OS** for
X, LinkedIn, and Bluesky — voice-modelled post generation, Spike Rank, and a
review queue. The LinkedIn automation engine was retired, and its replacement
has not been built yet. Most open work below comes from that gap.

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
    pnpm test:e2e         # Playwright, needs a prod build + Clerk dev creds
    pnpm seed:seo         # seed static marketing/SEO pages
    pnpm rank:smoke -- yourname.bsky.social
    pnpm exec tsc --noEmit   # typecheck — currently clean

`pnpm lint` is clean. It needs both `next/core-web-vitals` and `next/typescript`
in `.eslintrc.json` — core-web-vitals alone leaves the `@typescript-eslint`
rules undefined, and `lib/db.ts` has an inline disable for one of them.

## Invariants — do not break these

- Neon and Clerk are server-only. Never import `lib/db.ts` or read secrets from
  a client component.
- `users.clerk_user_id` is the join key to Clerk. Every other table keys off
  the local `users.id` uuid. `lib/session.ts` provisions the row on first
  sign-in and claims a pre-seeded row only when the Clerk email is *verified*.
- Migrations in `db/migrations/` apply in filename order:
  `psql "$DATABASE_URL" -f <file>`. Never edit an applied migration; add a new one.
- `comments`, `connections`, and `target_leaders` are deliberately gone. Do not
  reintroduce them — they belong to the retired automation product.
- Middleware redirects unauthenticated traffic explicitly rather than via
  `auth.protect()`, and the redirect target must stay relative (there is an
  e2e test asserting no open redirect).

## What actually works today

- Marketing site: features, pricing, blog, roles, industries, ICP, compares,
  legal/trust pages, `llms.txt`, sitemap
- Free tools: Spike Rank (Bluesky, public AppView, no credentials), thread
  splitter, LinkedIn profile audit from pasted text, lead capture + email
- Signed-in shell at `/app`: dashboard, queue (posts only), voice profile,
  settings incl. Razorpay checkout
- `/admin`: global automation kill switch backed by `system_settings`
- Privacy: data export and account deletion routes
- Webhooks: Clerk (user sync) and Razorpay (signature-verified)

## Todo

Roughly priority-ordered. Check items off here as they land.

### Correctness / hygiene
- [x] ~~Individual pages for the nav items~~ — `/features` index and
      `/how-it-works` are real pages now, not homepage anchors. The six
      `/features/<slug>` detail pages already existed.
- [x] ~~Split the admin portal from the user portal~~ — `/admin` has its own
      layout, sidebar, and one gate covering every child page, plus users,
      leads, and activity-log views.
- [x] ~~Add an ESLint config~~ — `.eslintrc.json` extends `next/core-web-vitals`
      and `next/typescript`; `pnpm lint` runs clean and non-interactively.
- [ ] Remove the dead `CommentRow`/`ConnectionRow` types and the hardcoded
      empty `comments`/`connections` arrays in `app/(app)/app/page.tsx` and
      `app/(app)/app/queue/page.tsx`, plus the UI branches that render them.
- [ ] Nav "Overview" still points at the homepage. Fine as-is, but if it should
      be a distinct page, that is the last anchor-style entry in the menu.
- [ ] Pricing sells "Keyword Auto-DM on X and Bluesky" (Pro tier,
      `lib/constants.ts`), but Bluesky DMs only reach accounts that opted into
      messages from strangers, so the automation would silently fail for most
      recipients. `capabilities.dm` is false for Bluesky. Either narrow the copy
      to X, or redefine the Bluesky half as a public reply. The *capture* side
      is fine — `readReplies` is true for both.
- [ ] Reconcile marketing copy with the retired engine. `app/(marketing)/trust`,
      `app/(marketing)/security`, `/admin`, and `README.md` still describe a live
      QStash → Playwright worker with human-speed delays and action windows.
      Either build it (below) or reword these pages — shipping unbacked safety
      claims is the risk here.

### The automation engine (the big one)
- [x] ~~Social account connection flow~~ — `/app/accounts` connects Bluesky for
      real with an app password; X and LinkedIn show as unavailable until an
      OAuth app exists. `lib/platforms/connect.ts` is the only writer.
- [x] ~~Publishing path~~ — `/app/composer` writes per-platform variants and the
      `publish_variant` job publishes them, claiming each variant with
      `where platform_post_id is null` so a retry cannot double-post.
- [x] ~~Scheduler/dispatch~~ — `/api/cron/dispatch` is back, QStash-signed and
      failing closed; `/api/jobs/run` executes one job per signed message.
      `pnpm jobs:tick` drives the same loop locally with no QStash account.
- [ ] Per-tier daily limits enforced against `user_daily_usage`, plus the
      auto-pause path via `users.consecutive_error_count` and
      `automation_log`. `lib/entitlements.ts` answers the connect/schedule
      questions; the per-day caps still need the safety gate that consumes them.
      The global kill switch is already wired into `runJob`.

### v2 tables with no code behind them
Decide build-or-drop for each; leaving empty tables around invites confusion.
- [ ] `voice_interviews`, `voice_calibrations`, `voice_embeddings` — the voice
      form writes to `users`, not `voice_profiles`, so the whole voice-modelling
      pipeline is schema-only. (`pgvector` is enabled for the embeddings.)
- [ ] `evergreen_items` — evergreen recycling not started
- [ ] `growth_plan_items` — `growth_plans` is only read by the export route
- [x] ~~`ai_generations`~~ — every AI call is logged with provider, model,
      tokens and cost.

### Not configured in production
Checked against `vercel env`: production has DATABASE_URL, Clerk, and
SESSION_ENCRYPTION_KEY only.
- [ ] `GEMINI_API_KEY` / `DEEPSEEK_API_KEY` — every AI generation path is dead
      in prod, including the free tools that call it
- [ ] `RESEND_API_KEY` — no transactional email is being sent
- [ ] `RAZORPAY_*` — checkout cannot complete in production

### Billing / ops
- [ ] Create the six `RAZORPAY_PLAN_*_USD` plans for the current
      $19/$39/$79 ladder and set them in prod. `lib/billing/razorpay.ts` falls
      back to the retired Essentials/Growth env vars; drop those once no live
      subscription references them.
- [ ] Verify subscription lifecycle end to end (checkout → webhook → tier
      change → downgrade/cancel). No e2e coverage exists for billing today.
- [ ] Production Clerk instance. `pk_test`/`sk_test` keys are a dev instance and
      will not work on the custom domain.
- [ ] CI: typecheck + lint + `pnpm test:e2e` on PRs.

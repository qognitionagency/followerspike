# Splitting development off production

**Status: not done yet. This is the runbook, and it needs your Neon account.**

Local `.env.local` and production point at the same Neon database. There is no
development branch. That means:

- `pnpm db:migrate` at your laptop prompt **is a production migration**
- the signed-in Playwright project **writes to production data**
- a bad query in development hits real customer rows

Nothing in the repo can fix that on its own, because creating a branch needs
credentials to your Neon account. What the repo now does is make the danger
loud instead of silent: see "The guard" below.

---

## Create the development branch

Neon calls these *branches*. A branch is a copy-on-write clone of production,
so it starts with the same schema and data and costs almost nothing until it
diverges. This takes about two minutes in the console.

1. Open the Neon console and select the project holding `neondb`.
2. Go to **Branches** and press **New branch**.
3. Name it `development`, parent `production` (or whatever the default branch is
   called), and include data. Copy-on-write means "include data" is not a real
   copy and is effectively free.
4. Open the new branch, go to **Connection Details**, and copy the **pooled**
   connection string. Pooled, not direct: the app uses Neon's serverless HTTP
   driver and the pooled endpoint is what it expects.

## Point local development at it

Replace `DATABASE_URL` in `.env.local` with the development branch string, and
add the production endpoint host so the guard knows what to protect:

    DATABASE_URL="postgresql://…@ep-<development-endpoint>-pooler.<region>.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    PRODUCTION_DATABASE_HOST="ep-<production-endpoint>-pooler.<region>.aws.neon.tech"

`PRODUCTION_DATABASE_HOST` is the endpoint host from the *production* branch's
connection string, which you can read in the Neon console or in Vercel's
`DATABASE_URL`. It is not written down here because this repository is public.
Do not change it when you point `DATABASE_URL` elsewhere: it names the thing to
defend, not the thing to use.

Then confirm the switch worked:

    pnpm db:status

It should report the same 12 applied migrations, because the branch was cloned
from production. If it reports a different number, `DATABASE_URL` is not
pointing where you think.

## Give the e2e suite its own branch

The signed-in Playwright project writes to whatever database it is given, and it
should never be given production. Either point `E2E_DATABASE_URL` at the
`development` branch, or create a third branch named `test` and use that. A
separate `test` branch is better: the signed-in suite creates and deletes rows,
and you do not want that interleaved with whatever you are doing by hand.

Set the same value as the `E2E_DATABASE_URL` GitHub secret so CI stops skipping
the e2e job.

## Production is unchanged

Vercel keeps the production `DATABASE_URL` it already has. Do not add
`PRODUCTION_DATABASE_HOST` to Vercel: the guard skips non-interactive
environments anyway, and production is supposed to migrate itself.

---

## The guard

`scripts/migrate.ts` refuses to apply migrations when `DATABASE_URL` resolves to
`PRODUCTION_DATABASE_HOST`, unless you pass `--production`:

    pnpm db:migrate                    # refuses, explains, exits 1
    pnpm db:migrate -- --production    # warns loudly, then proceeds
    pnpm db:status                     # never blocked, reading is safe

It compares Neon *endpoint ids* rather than whole hostnames, so the pooled and
direct URLs for the same branch are recognised as the same database.

Two deliberate exemptions:

- **`PRODUCTION_DATABASE_HOST` unset**: nothing is enforced. A deployment that
  never configured this behaves exactly as it did before, so the guard cannot
  break anyone who has not opted in.
- **`CI` or `VERCEL` set**: non-interactive environments migrate whatever their
  own configuration points at. The guard exists to catch a human at a prompt.

## Why not just refuse always

Because the production database does legitimately need migrating, and a guard
with no escape hatch gets worked around by editing the script, which is worse
than a guard that makes you type six extra characters and prints a warning.

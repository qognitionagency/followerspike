/**
 * Drive the job queue locally, without a QStash account.
 *
 *   pnpm jobs:tick             # poll forever, ctrl-c to stop
 *   pnpm jobs:tick -- --once   # a single claim-and-run pass, for scripts and CI
 *
 * Does exactly what /api/cron/dispatch does in its inline mode — reap, claim,
 * run — minus the HTTP hop and the signature, which is why it can run against a
 * machine that has no signing keys. Needs DATABASE_URL in the environment, the
 * same as scripts/rank-smoke.ts:
 *
 *   DATABASE_URL="postgres://..." pnpm jobs:tick
 */
import { claimDue, reapExpiredLeases } from "@/lib/jobs/queue";
import { runJob } from "@/lib/jobs/handlers";
import { sweepRecurringWork } from "@/lib/jobs/schedule";
import { databaseConfigured } from "@/lib/db";

const BATCH = 25;
const POLL_INTERVAL_MS = 5000;

async function tick(): Promise<number> {
  const reaped = await reapExpiredLeases();
  if (reaped > 0) {
    console.log(`reaped ${reaped} expired lease(s)`);
  }

  // Same order as the dispatcher: anything the calendar has just made due goes
  // out in this tick. Without it, evergreen cadence and the weekly rank refresh
  // would be untestable locally.
  const swept = await sweepRecurringWork();
  if (swept.evergreen > 0 || swept.rank > 0) {
    console.log(`swept ${swept.evergreen} evergreen refill(s), ${swept.rank} rank refresh(es)`);
  }

  const jobs = await claimDue(BATCH);
  for (const job of jobs) {
    const result = await runJob(job);
    if (result.ok) {
      console.log(`ok    ${job.kind} ${job.id} (attempt ${job.attempts})`);
    } else {
      console.log(`fail  ${job.kind} ${job.id} (attempt ${job.attempts}/${job.max_attempts}) — ${result.error}`);
    }
  }

  return jobs.length;
}

async function main() {
  if (!databaseConfigured()) {
    console.error("DATABASE_URL is not set — nothing to poll.");
    process.exit(1);
  }

  if (process.argv.includes("--once")) {
    const ran = await tick();
    console.log(`ran ${ran} job(s)`);
    return;
  }

  console.log(`polling every ${POLL_INTERVAL_MS}ms — ctrl-c to stop`);
  let stopping = false;
  process.on("SIGINT", () => {
    // Finishes the tick in flight rather than abandoning a claimed job to its
    // lease, which would idle it for fifteen minutes.
    console.log("\nstopping after the current tick…");
    stopping = true;
  });

  while (!stopping) {
    await tick();
    if (stopping) break;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main().catch((error) => {
  console.error("FAILED:", error);
  process.exit(1);
});

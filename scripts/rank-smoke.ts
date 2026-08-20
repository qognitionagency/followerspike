/**
 * Smoke-test Spike Rank against a live public profile.
 *   npx tsx scripts/rank-smoke.ts bsky.app
 */
import { rankBlueskyProfile } from "@/lib/rank/bluesky";

async function main() {
  const handle = process.argv[2] ?? "bsky.app";
  const rank = await rankBlueskyProfile(handle);

  console.log(`\n${rank.handle} — ${rank.score}/100\n`);
  console.log("Observed:", rank.observed, "\n");

  for (const pillar of rank.pillars) {
    console.log(`${pillar.label}: ${pillar.score}/100 (weight ${pillar.weight})`);
    for (const entry of pillar.checks) {
      console.log(`   [${entry.status.padEnd(7)}] ${entry.label} — ${entry.evidence}`);
    }
  }

  console.log("\nTop fixes:");
  rank.topFixes.forEach((fix, index) => console.log(`  ${index + 1}. ${fix.label} (${fix.effort}) — ${fix.fix}`));
}

main().catch((error) => {
  console.error("FAILED:", error);
  process.exit(1);
});

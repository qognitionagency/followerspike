/**
 * Smoke-test Spike Rank against a live public profile.
 *   npx tsx scripts/rank-smoke.ts bsky.app
 */
import { rankBlueskyProfile } from "@/lib/rank/bluesky";
import { getRankTrend, recordRankSnapshot } from "@/lib/rank/store";

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

  // Exercises the history layer too. No-ops without SUPABASE_SERVICE_ROLE_KEY.
  const snapshotId = await recordRankSnapshot(rank);
  console.log("\nSnapshot:", snapshotId ?? "not stored (no SUPABASE_SERVICE_ROLE_KEY)");

  const trend = await getRankTrend("bluesky", rank.handle);
  if (trend.snapshots.length) {
    console.log(`Trend: ${trend.snapshots.length} snapshot(s), score delta ${trend.scoreDelta ?? "n/a"}`);
    for (const snap of trend.snapshots) {
      console.log(`   ${snap.createdAt} — ${snap.score}/100 (${snap.followersCount ?? "?"} followers)`);
    }
  }
}

main().catch((error) => {
  console.error("FAILED:", error);
  process.exit(1);
});

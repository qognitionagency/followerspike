import { PILLARS, type CheckStatus, type PillarScore, type RankCheck, type RankPlatform, type RankResult } from "@/lib/rank/types";

const STATUS_CREDIT: Record<CheckStatus, number> = {
  pass: 1,
  warn: 0.5,
  fail: 0,
  // An unknown check must not punish the user for data we could not read.
  unknown: 0,
};

const EFFORT_RANK: Record<RankCheck["effort"], number> = { S: 0, M: 1, L: 2 };

/**
 * Rolls individual checks up into pillar scores and one 0-100 number.
 *
 * Checks whose status is "unknown" are dropped from their pillar's denominator
 * rather than scored as failures, so a platform we cannot fully read yields a
 * score built only from what was actually observed.
 */
export function scoreChecks(platform: RankPlatform, handle: string, checks: RankCheck[], observed: RankResult["observed"]): RankResult {
  const pillars: PillarScore[] = PILLARS.map((pillar) => {
    const own = checks.filter((check) => check.pillar === pillar.id);
    const scorable = own.filter((check) => check.status !== "unknown");
    const available = scorable.reduce((sum, check) => sum + check.weight, 0);
    const earned = scorable.reduce((sum, check) => sum + check.weight * STATUS_CREDIT[check.status], 0);

    return {
      id: pillar.id,
      label: pillar.label,
      weight: pillar.weight,
      score: available > 0 ? Math.round((earned / available) * 100) : 0,
      checks: own,
    };
  });

  const scored = pillars.filter((pillar) => pillar.checks.some((check) => check.status !== "unknown"));
  const totalWeight = scored.reduce((sum, pillar) => sum + pillar.weight, 0);
  const score = totalWeight > 0
    ? Math.round(scored.reduce((sum, pillar) => sum + pillar.score * pillar.weight, 0) / totalWeight)
    : 0;

  return {
    platform,
    handle,
    score,
    pillars,
    topFixes: rankFixes(checks),
    observed,
  };
}

/**
 * Orders the failing checks by what moves the score most per unit of work:
 * points at stake first, then cheapest effort.
 */
export function rankFixes(checks: RankCheck[], limit = 5): RankCheck[] {
  const pillarWeight = new Map(PILLARS.map((pillar) => [pillar.id, pillar.weight]));

  return checks
    .filter((check) => check.status === "fail" || check.status === "warn")
    .map((check) => {
      const atStake = (pillarWeight.get(check.pillar) ?? 0) * check.weight * (check.status === "fail" ? 1 : 0.5);
      return { check, atStake };
    })
    .sort((a, b) => {
      if (b.atStake !== a.atStake) return b.atStake - a.atStake;
      return EFFORT_RANK[a.check.effort] - EFFORT_RANK[b.check.effort];
    })
    .slice(0, limit)
    .map((entry) => entry.check);
}

export function check(input: Omit<RankCheck, "fix"> & { fix?: string }): RankCheck {
  return { ...input, fix: input.fix ?? "" };
}

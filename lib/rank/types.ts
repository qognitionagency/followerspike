export type RankPlatform = "x" | "bluesky" | "linkedin";

export type PillarId = "positioning" | "proof" | "cadence" | "engagement" | "conversion";

export type CheckStatus = "pass" | "warn" | "fail" | "unknown";

export type FixEffort = "S" | "M" | "L";

export type RankCheck = {
  id: string;
  pillar: PillarId;
  label: string;
  status: CheckStatus;
  /** Share of the pillar's weight this check carries. Weights inside a pillar sum to 1. */
  weight: number;
  /** What we actually observed, in the user's terms. */
  evidence: string;
  /** Empty when the check passes. */
  fix: string;
  effort: FixEffort;
};

export type PillarScore = {
  id: PillarId;
  label: string;
  /** Share of the overall 100. Pillar weights sum to 1. */
  weight: number;
  /** 0-100 within the pillar. */
  score: number;
  checks: RankCheck[];
};

export type RankResult = {
  platform: RankPlatform;
  handle: string;
  /** 0-100. */
  score: number;
  pillars: PillarScore[];
  /** Highest-impact failing checks first. */
  topFixes: RankCheck[];
  /** Facts the scoring ran on, surfaced so the score is auditable. */
  observed: Record<string, string | number | boolean | null>;
};

export const PILLARS: Array<{ id: PillarId; label: string; weight: number }> = [
  { id: "positioning", label: "Discoverability and positioning", weight: 0.25 },
  { id: "proof", label: "Proof and credibility", weight: 0.2 },
  { id: "cadence", label: "Content cadence", weight: 0.2 },
  { id: "engagement", label: "Engagement quality", weight: 0.2 },
  { id: "conversion", label: "Conversion path", weight: 0.15 },
];

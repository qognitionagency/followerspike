/**
 * AI call accounting, stored in `ai_generations`.
 *
 * Every provider call — successful or not — gets one row here, so cost and
 * failure rate are answerable from the database rather than from logs. The
 * table has existed since the v2 migration; `lib/ai/client.ts` is its only
 * writer, which keeps the accounting from drifting per call site.
 *
 * Recording is best-effort, mirroring `lib/rank/store.ts`: a generation is
 * useful to the caller whether or not we managed to bill it, so callers never
 * await a failure here into their response.
 */
import { databaseConfigured, db } from "@/lib/db";
import type { AiGeneration } from "@/lib/types/db";

/** Who the call was made for. All three are nullable — free tools run anonymously. */
export type AiUsageContext = {
  workspaceId?: string | null;
  userId?: string | null;
  postId?: string | null;
};

export type AiUsageEntry = AiUsageContext & {
  /** "none" when no provider produced a usable response. */
  provider: string;
  /** The failure reason when provider is "none", so a failed call is still identifiable. */
  model: string;
  /** Names the generator, e.g. "generate_post". Used for per-feature cost rollups. */
  actionType: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

/**
 * USD per million tokens, matched by model-id prefix.
 *
 * Published list prices as of 2026-08. A model that is not listed logs zero
 * cost rather than a guessed one — an unpriced row is obviously unpriced,
 * whereas a wrong price silently corrupts every rollup built on it. Update this
 * table when the model list or the vendors' pricing changes.
 */
const MODEL_RATES: Array<{ prefix: string; input: number; output: number }> = [
  { prefix: "gemini-3-pro", input: 2.0, output: 12.0 },
  { prefix: "gemini-2.5-pro", input: 1.25, output: 10.0 },
  { prefix: "gemini-2.5-flash", input: 0.3, output: 2.5 },
  { prefix: "gemini-2.0-flash", input: 0.1, output: 0.4 },
  { prefix: "deepseek-reasoner", input: 0.55, output: 2.19 },
  { prefix: "deepseek-chat", input: 0.27, output: 1.1 },
  // Embeddings bill input only; the output column is zero rather than absent
  // so an embedding row costs the same shape of arithmetic as every other.
  { prefix: "gemini-embedding", input: 0.15, output: 0 },
];

/** Zero for an unknown model — see MODEL_RATES. */
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const rate = MODEL_RATES.find((entry) => model.startsWith(entry.prefix));
  if (!rate) return 0;

  const cost = (inputTokens / 1_000_000) * rate.input + (outputTokens / 1_000_000) * rate.output;
  // cost_usd is numeric(10,6); anything finer than a microdollar is noise.
  return Math.round(cost * 1_000_000) / 1_000_000;
}

/**
 * Appends one row. Returns its id, or null when the database is unconfigured
 * (local dev) or the write failed — never throws.
 */
export async function logAiGeneration(entry: AiUsageEntry): Promise<string | null> {
  if (!databaseConfigured()) return null;

  try {
    const sql = db();
    const rows = await sql`
      insert into ai_generations (
        workspace_id, user_id, post_id, provider, model,
        action_type, input_tokens, output_tokens, cost_usd
      )
      values (
        ${entry.workspaceId ?? null},
        ${entry.userId ?? null},
        ${entry.postId ?? null},
        ${entry.provider},
        ${entry.model},
        ${entry.actionType},
        ${Math.max(0, Math.round(entry.inputTokens))},
        ${Math.max(0, Math.round(entry.outputTokens))},
        ${entry.costUsd.toFixed(6)}
      )
      returning id
    `;

    return (rows[0] as Pick<AiGeneration, "id"> | undefined)?.id ?? null;
  } catch {
    // Accounting is not worth failing a generation over.
    return null;
  }
}

/**
 * Points an already-logged generation at the post it produced.
 *
 * The row is written before the post exists — the post is only inserted once
 * the text comes back — so `post_id` is filled in afterwards. Best-effort: the
 * cost is recorded either way, only the attribution is lost.
 */
export async function attachAiGenerationToPost(generationId: string, postId: string): Promise<void> {
  if (!databaseConfigured()) return;

  try {
    const sql = db();
    await sql`update ai_generations set post_id = ${postId} where id = ${generationId}`;
  } catch {
    // The cost row is still valid without the post link.
  }
}

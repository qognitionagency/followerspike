import { GoogleGenAI } from "@google/genai";
import { db, databaseConfigured } from "@/lib/db";
import { optionalEnv } from "@/lib/env";
import { estimateCostUsd, logAiGeneration, type AiUsageContext } from "@/lib/ai/usage";

/**
 * Voice exemplars in vector space.
 *
 * `voice_embeddings.embedding` is `vector(1024)` and `pgvector` was enabled by
 * the v2 migration, but nothing ever produced a vector. The point of the table
 * is retrieval, not storage: when generating a post about pricing, the exemplars
 * worth showing the model are the ones this founder wrote about pricing, not the
 * five most recent things they posted. That is a similarity search, and it is
 * the only reason this is a vector column rather than a text array.
 *
 * Everything here degrades to a no-op without an embedding provider. A missing
 * key must not break saving a voice profile — it costs retrieval quality, and
 * the caller falls back to the profile's plain `exemplars` list.
 */

/** Must match the column width in db/migrations/20260820120000_v2_founder_os.sql. */
export const EMBEDDING_DIMENSIONS = 1024;

/**
 * Gemini's embedding model, pinned. Changing it re-embeds nothing on its own:
 * vectors from two different models are not comparable, so a change here needs a
 * backfill or the old rows will quietly rank as unrelated to everything.
 */
const EMBEDDING_MODEL = "gemini-embedding-001";

export type EmbeddingSource = "imported" | "generated";

export function embeddingsConfigured(): boolean {
  return Boolean(optionalEnv("GEMINI_API_KEY"));
}

/**
 * Postgres wants a vector literal, not a JSON array.
 *
 * `pgvector` accepts the bracketed form `[1,2,3]`, which is also what JSON.stringify
 * produces for a number array — but only as long as every element is finite.
 * A NaN would serialize to `null` and the cast would fail at insert time, so
 * non-finite values are rejected here where the error is legible.
 */
function toVectorLiteral(values: number[]): string {
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Expected ${EMBEDDING_DIMENSIONS} dimensions, received ${values.length}`);
  }
  if (!values.every((value) => Number.isFinite(value))) {
    throw new Error("Embedding contained a non-finite value");
  }
  return `[${values.join(",")}]`;
}

/**
 * Embeds one piece of text.
 *
 * Returns null rather than throwing when there is no provider: callers treat
 * embedding as an enhancement, and a thrown error here would take down the save
 * it was decorating.
 */
export async function embed(text: string, context: AiUsageContext = {}): Promise<number[] | null> {
  const apiKey = optionalEnv("GEMINI_API_KEY");
  if (!apiKey) return null;

  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: trimmed,
      config: { outputDimensionality: EMBEDDING_DIMENSIONS },
    });

    const values = response.embeddings?.[0]?.values;
    if (!values || values.length !== EMBEDDING_DIMENSIONS) return null;

    // Rough token count: the API does not report usage for embeddings, and a
    // consistent approximation is more useful in a cost rollup than a blank.
    const approximateTokens = Math.ceil(trimmed.length / 4);
    void logAiGeneration({
      ...context,
      provider: "gemini",
      model: EMBEDDING_MODEL,
      actionType: "embed_voice_sample",
      inputTokens: approximateTokens,
      outputTokens: 0,
      costUsd: estimateCostUsd(EMBEDDING_MODEL, approximateTokens, 0),
    });

    return values;
  } catch {
    // Same contract as a missing key: retrieval quality degrades, nothing breaks.
    return null;
  }
}

/**
 * Stores one exemplar and its vector.
 *
 * Skips silently when the text could not be embedded — a row with a null
 * embedding would be invisible to every similarity search anyway, so it would
 * only be a row that looks stored and never comes back.
 */
export async function storeEmbedding(input: {
  userId: string;
  voiceProfileId: string | null;
  content: string;
  source?: EmbeddingSource;
  context?: AiUsageContext;
}): Promise<boolean> {
  if (!databaseConfigured()) return false;

  const values = await embed(input.content, input.context ?? {});
  if (!values) return false;

  const sql = db();
  await sql`
    insert into voice_embeddings (user_id, voice_profile_id, content, embedding, source)
    values (
      ${input.userId},
      ${input.voiceProfileId},
      ${input.content},
      ${toVectorLiteral(values)}::vector,
      ${input.source ?? "imported"}
    )
  `;

  return true;
}

/**
 * Replaces a profile's exemplar set.
 *
 * Delete-then-insert rather than diffing: the set is small, the texts are the
 * identity (there is no stable id for "the third exemplar"), and a diff would
 * have to re-embed anything whose text changed regardless.
 */
export async function replaceEmbeddings(input: {
  userId: string;
  voiceProfileId: string;
  contents: string[];
  context?: AiUsageContext;
}): Promise<number> {
  if (!databaseConfigured() || !embeddingsConfigured()) return 0;

  const sql = db();
  await sql`delete from voice_embeddings where voice_profile_id = ${input.voiceProfileId}`;

  let stored = 0;
  for (const content of input.contents) {
    const ok = await storeEmbedding({
      userId: input.userId,
      voiceProfileId: input.voiceProfileId,
      content,
      source: "imported",
      context: input.context,
    });
    if (ok) stored += 1;
  }

  return stored;
}

export type SimilarExemplar = {
  content: string;
  /** 0–1, cosine similarity. Higher is closer. */
  similarity: number;
};

/**
 * The exemplars closest to a topic.
 *
 * `<=>` is pgvector's cosine distance, so similarity is 1 minus it. Cosine
 * rather than L2 because the vectors are normalized and only direction carries
 * meaning — two posts on the same subject at different lengths should rank as
 * close, which L2 would not give.
 */
export async function similarExemplars(input: {
  userId: string;
  topic: string;
  limit?: number;
  context?: AiUsageContext;
}): Promise<SimilarExemplar[]> {
  if (!databaseConfigured()) return [];

  const values = await embed(input.topic, input.context ?? {});
  if (!values) return [];

  const sql = db();
  const rows = await sql`
    select content, 1 - (embedding <=> ${toVectorLiteral(values)}::vector) as similarity
    from voice_embeddings
    where user_id = ${input.userId} and embedding is not null
    order by embedding <=> ${toVectorLiteral(values)}::vector
    limit ${input.limit ?? 5}::int
  `;

  return rows.map((row) => ({
    content: row.content as string,
    similarity: Number(row.similarity ?? 0),
  }));
}

/** How many exemplars a profile has embedded, for the UI to report honestly. */
export async function embeddingCount(voiceProfileId: string): Promise<number> {
  if (!databaseConfigured()) return 0;
  const sql = db();
  const rows = await sql`
    select count(*)::int as total from voice_embeddings where voice_profile_id = ${voiceProfileId}
  `;
  return (rows[0]?.total as number) ?? 0;
}

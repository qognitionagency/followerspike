/**
 * Provider access for every AI generation in the app.
 *
 * Two things are load-bearing here.
 *
 * First, `generateJson` reports failure instead of inventing success. It used to
 * return a caller-supplied hardcoded fallback whenever both providers failed —
 * and, because a missing API key throws inside the provider call, also whenever
 * no key was configured at all. Production has neither `GEMINI_API_KEY` nor
 * `DEEPSEEK_API_KEY`, so every audit score, generated post and relevance score
 * served was canned prose returned with a 200 and no way for the caller to tell.
 * Now the result is a discriminated union: a caller that wants a fallback opts
 * into one explicitly through `withFallback`, and a caller that must not publish
 * canned text under a user's name checks `ok`.
 *
 * Second, every attempt is bounded by an AbortController and logged to
 * `ai_generations` (see `lib/ai/usage.ts`), including failures.
 */
import { GoogleGenAI, type GenerateContentConfig } from "@google/genai";
import { optionalEnv } from "@/lib/env";
import { estimateCostUsd, logAiGeneration, type AiUsageContext } from "@/lib/ai/usage";

export type AiProvider = "gemini" | "deepseek";

export type AiMessage = {
  role: "system" | "user";
  content: string;
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
};

export type JsonSchema = Record<string, unknown>;

export type AiTokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

/**
 * - `no_provider_configured` — no API key is set; nothing was attempted.
 * - `invalid_response` — a provider answered, but not with the requested shape.
 * - `all_providers_failed` — every configured provider errored, timed out, or
 *   returned nothing.
 */
export type AiFailureReason = "no_provider_configured" | "all_providers_failed" | "invalid_response";

export type AiSuccess<T> = {
  ok: true;
  value: T;
  provider: AiProvider;
  model: string;
  usage: AiTokenUsage;
  /** Row id in `ai_generations`, or null when accounting could not be written. */
  generationId: string | null;
};

export type AiFailure = {
  ok: false;
  reason: AiFailureReason;
  /** One entry per provider attempted, in attempt order. Never shown to end users. */
  errors: string[];
};

export type AiResult<T> = AiSuccess<T> | AiFailure;

export type GenerateJsonOptions<T> = {
  /** zod-backed guard, as in `lib/ai/generators.ts`. */
  validate: (value: unknown) => value is T;
  /** Hand-written JSON Schema passed to Gemini's structured output. */
  schema?: JsonSchema;
  /** Names the generator in `ai_generations.action_type`, e.g. "generate_post". */
  actionType: string;
  /** Attribution for the cost row. Anonymous free-tool calls pass nothing. */
  context?: AiUsageContext;
};

/** A provider that hangs would hold a serverless invocation open until the platform kills it. */
const DEFAULT_TIMEOUT_MS = 20_000;

function timeoutMs(): number {
  const configured = Number.parseInt(optionalEnv("AI_TIMEOUT_MS"), 10);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TIMEOUT_MS;
}

function stripJsonFence(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/** What one provider call returns before validation. */
type ProviderResponse = {
  text: string;
  model: string;
  usage: AiTokenUsage;
};

function geminiConfigured(): boolean {
  return Boolean(optionalEnv("GEMINI_API_KEY"));
}

function deepSeekConfigured(): boolean {
  return Boolean(optionalEnv("DEEPSEEK_API_KEY"));
}

/**
 * Runs one provider call under a deadline. The controller is passed down rather
 * than raced against, so an abort actually cancels the underlying request
 * instead of leaving it running behind a rejected promise.
 */
async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ms = timeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`AI request timed out after ${ms}ms`)), ms);

  try {
    return await run(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`timed out after ${ms}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(messages: AiMessage[], signal: AbortSignal, schema?: JsonSchema): Promise<ProviderResponse> {
  const apiKey = optionalEnv("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("Gemini API key is not configured");
  }

  const model = optionalEnv("GEMINI_MODEL", "gemini-3-pro-preview");
  const ai = new GoogleGenAI({ apiKey });
  const system = messages.find((message) => message.role === "system")?.content ?? "";
  const user = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n\n");
  const config: GenerateContentConfig = {
    systemInstruction: system,
    responseMimeType: "application/json",
    maxOutputTokens: 4096,
    abortSignal: signal,
    ...(schema ? { responseJsonSchema: schema } : {}),
  };

  if (!model.startsWith("gemini-3")) {
    config.temperature = 0.6;
  }

  const response = await ai.models.generateContent({
    model,
    contents: user,
    config,
  });
  const text = response.text ?? "";
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  const meta = response.usageMetadata;
  return {
    text,
    model,
    usage: {
      inputTokens: meta?.promptTokenCount ?? 0,
      // Thinking tokens are billed as output, so they belong in the same bucket.
      outputTokens: (meta?.candidatesTokenCount ?? 0) + (meta?.thoughtsTokenCount ?? 0),
    },
  };
}

async function callDeepSeek(messages: AiMessage[], signal: AbortSignal): Promise<ProviderResponse> {
  const apiKey = optionalEnv("DEEPSEEK_API_KEY");
  if (!apiKey) {
    throw new Error("DeepSeek API key is not configured");
  }

  const model = optionalEnv("DEEPSEEK_MODEL", "deepseek-chat");
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      response_format: { type: "json_object" },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed with ${response.status}`);
  }

  const json = (await response.json()) as DeepSeekResponse;
  const text = json.choices?.[0]?.message?.content ?? "";
  if (!text) {
    throw new Error("DeepSeek returned an empty response");
  }

  return {
    text,
    model,
    usage: {
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
    },
  };
}

/**
 * Asks the first working provider for JSON matching `validate`.
 *
 * Never throws and never substitutes canned content: the caller gets either a
 * validated value with the provider that produced it, or a typed failure.
 */
export async function generateJson<T>(messages: AiMessage[], options: GenerateJsonOptions<T>): Promise<AiResult<T>> {
  const { validate, schema, actionType, context = {} } = options;

  const providers: AiProvider[] = [];
  if (geminiConfigured()) providers.push("gemini");
  if (deepSeekConfigured()) providers.push("deepseek");

  if (providers.length === 0) {
    return failure("no_provider_configured", ["no AI provider is configured"], actionType, context);
  }

  const errors: string[] = [];
  // Distinguishes "the model answered with the wrong shape" from "nothing answered".
  let sawResponse = false;
  let sawTransportFailure = false;

  for (const provider of providers) {
    try {
      const response = await withTimeout((signal) =>
        provider === "gemini" ? callGemini(messages, signal, schema) : callDeepSeek(messages, signal)
      );
      sawResponse = true;

      const parsed = JSON.parse(stripJsonFence(response.text)) as unknown;
      if (!validate(parsed)) {
        errors.push(`${provider}: invalid JSON shape`);
        continue;
      }

      const generationId = await logAiGeneration({
        ...context,
        provider,
        model: response.model,
        actionType,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        costUsd: estimateCostUsd(response.model, response.usage.inputTokens, response.usage.outputTokens),
      });

      return {
        ok: true,
        value: parsed,
        provider,
        model: response.model,
        usage: response.usage,
        generationId,
      };
    } catch (error) {
      // A parse error means the provider answered with something that was not
      // JSON, which is a shape problem rather than a transport one.
      if (error instanceof SyntaxError) {
        errors.push(`${provider}: response was not JSON`);
        continue;
      }
      sawTransportFailure = true;
      errors.push(`${provider}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  const reason: AiFailureReason = sawResponse && !sawTransportFailure ? "invalid_response" : "all_providers_failed";
  return failure(reason, errors, actionType, context);
}

async function failure(
  reason: AiFailureReason,
  errors: string[],
  actionType: string,
  context: AiUsageContext
): Promise<AiFailure> {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`AI generation failed (${actionType}): ${errors.join(" | ")}`);
  }

  // Failures are logged too, so the table answers "how often is this broken?"
  // and not only "what did it cost?". `ai_generations` has no status column, so
  // the reason rides in `model` behind the sentinel provider.
  await logAiGeneration({
    ...context,
    provider: "none",
    model: reason,
    actionType,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
  });

  return { ok: false, reason, errors };
}

/**
 * Opts a call site into degrading gracefully.
 *
 * Marketing pages and free tools would rather show something useful than an
 * error, and that is a legitimate choice — but it is now a choice, made
 * visibly, per call site. Anything that publishes under a user's real name must
 * branch on `result.ok` instead of reaching for this.
 */
export function withFallback<T>(result: AiResult<T>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

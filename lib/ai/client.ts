import { optionalEnv } from "@/lib/env";

type AiProvider = "gemini" | "deepseek";

export type AiMessage = {
  role: "system" | "user";
  content: string;
};

type GeminiPart = {
  text?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function stripJsonFence(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

async function callGemini(messages: AiMessage[]): Promise<string> {
  const apiKey = optionalEnv("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("Gemini API key is not configured");
  }

  const system = messages.find((message) => message.role === "system")?.content ?? "";
  const user = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}`);
  }

  const json = (await response.json()) as GeminiResponse;
  const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  return text;
}

async function callDeepSeek(messages: AiMessage[]): Promise<string> {
  const apiKey = optionalEnv("DEEPSEEK_API_KEY");
  if (!apiKey) {
    throw new Error("DeepSeek API key is not configured");
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: 0.6,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed with ${response.status}`);
  }

  const json = (await response.json()) as DeepSeekResponse;
  const text = json.choices?.[0]?.message?.content ?? "";
  if (!text) {
    throw new Error("DeepSeek returned an empty response");
  }
  return text;
}

async function callProvider(provider: AiProvider, messages: AiMessage[]): Promise<string> {
  return provider === "gemini" ? callGemini(messages) : callDeepSeek(messages);
}

export async function generateJson<T>(
  messages: AiMessage[],
  fallback: T,
  validate: (value: unknown) => value is T
): Promise<T> {
  const providers: AiProvider[] = ["gemini", "deepseek"];
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      const raw = await callProvider(provider, messages);
      const parsed = JSON.parse(stripJsonFence(raw)) as unknown;
      if (validate(parsed)) {
        return parsed;
      }
      errors.push(`${provider}: invalid JSON shape`);
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn("AI fallback used", errors.join(" | "));
  }

  return fallback;
}

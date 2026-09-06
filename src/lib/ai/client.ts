import OpenAI, { APIError } from "openai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import { z } from "zod";
import { getConfiguredSiteOrigin } from "@/lib/site-url";

declare global {
  var openRouterClientGlobal: OpenAI | undefined;
}

// Overridable per deployment (e.g. to a stronger or cheaper model) without a
// code change. gpt-4o-mini is the default: cheap, fast, supports vision (for
// scan-business-card.ts) and follows a JSON-shape instruction reliably —
// unlike OpenAI's own "strict" json_schema mode, plain json_object mode is
// supported by virtually every model OpenRouter routes to, so switching
// OPENROUTER_MODEL to a different provider's model doesn't risk breaking
// structured output.
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

export function isAiConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export function getOpenRouterClient() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  if (!globalThis.openRouterClientGlobal) {
    globalThis.openRouterClientGlobal = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      maxRetries: 2,
      // Both optional and purely cosmetic on OpenRouter's own dashboard/
      // rankings — never read by this app, safe to omit if SITE_URL isn't set.
      defaultHeaders: {
        "HTTP-Referer": getConfiguredSiteOrigin() ?? undefined,
        "X-Title": "GoTech CRM",
      },
    });
  }
  return globalThis.openRouterClientGlobal;
}

// Shared across every "use server" file that calls the AI — kept here rather
// than in one of them since a "use server" module can only export async
// functions.
export function describeAiError(error: unknown): string {
  if (error instanceof APIError) {
    if (error.status === 401 || error.status === 403) {
      return "AI request failed: check that OPENROUTER_API_KEY is set correctly.";
    }
    if (error.status === 429) {
      return "AI request was rate-limited — try again in a moment.";
    }
    if (error.status && error.status >= 500) {
      return `The AI service is temporarily overloaded — try again in a moment. (${error.message})`;
    }
    return `AI request failed: ${error.message}`;
  }
  return "AI request failed unexpectedly.";
}

export type AiResult<T> = { status: "ok"; data: T } | { status: "error"; message: string };

export const AI_NOT_CONFIGURED: AiResult<never> = {
  status: "error",
  message: "AI features aren't configured — set OPENROUTER_API_KEY to enable them.",
};

// Shared across every "use server" file that needs structured JSON back from
// the model (see ai-insights.ts, testimonials.ts, scan-business-card.ts) —
// kept here rather than in one of them since a "use server" module can only
// export async functions, and each caller supplies its own systemPrompt/
// persona rather than this hardcoding one voice for every feature.
//
// `userContent` is a plain string for text-only callers, or an array of
// OpenAI-style content parts (text + image_url) for scan-business-card.ts's
// vision request — the Chat Completions message format both routes through.
//
// There's no cross-provider equivalent of Gemini's native responseJsonSchema
// reliable enough to depend on for every model OPENROUTER_MODEL might be set
// to, so the schema is instead spelled out in the prompt and enforced by
// parsing + Zod validation afterward, same as before the JSON came back
// pre-validated by the provider.
export async function callAi<T>(
  schema: z.ZodType<T>,
  systemPrompt: string,
  userContent: string | ChatCompletionContentPart[],
): Promise<AiResult<T>> {
  try {
    const client = getOpenRouterClient();
    const response = await client.chat.completions.create({
      model: OPENROUTER_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${systemPrompt}\n\nRespond with ONLY a single JSON object (no surrounding text, no markdown code fence) matching this JSON Schema:\n${JSON.stringify(z.toJSONSchema(schema))}`,
        },
        { role: "user", content: userContent },
      ],
    });

    const choice = response.choices[0];
    const finishReason = choice?.finish_reason;
    if (finishReason && finishReason !== "stop" && finishReason !== "length") {
      return { status: "error", message: "The AI declined to respond to this request." };
    }

    const text = choice?.message?.content;
    if (!text) {
      return { status: "error", message: "The model didn't return a usable response." };
    }

    const parsed = schema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      return { status: "error", message: "The model didn't return a usable response." };
    }
    return { status: "ok", data: parsed.data };
  } catch (error) {
    return { status: "error", message: describeAiError(error) };
  }
}

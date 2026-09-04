import { ApiError, FinishReason, GoogleGenAI } from "@google/genai";
import { z } from "zod";

declare global {
  var geminiClientGlobal: GoogleGenAI | undefined;
}

export const GEMINI_MODEL = "gemini-flash-latest";

export function isAiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  if (!globalThis.geminiClientGlobal) {
    globalThis.geminiClientGlobal = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return globalThis.geminiClientGlobal;
}

// Shared across every "use server" file that calls Gemini — kept here
// rather than in one of them since a "use server" module can only export
// async functions.
export function describeAiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return "AI request failed: check that GEMINI_API_KEY is set correctly.";
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
  message: "AI features aren't configured — set GEMINI_API_KEY to enable them.",
};

// Shared across every "use server" file that calls Gemini for structured
// JSON output (see ai-insights.ts, testimonials.ts) — kept here rather than
// in one of them since a "use server" module can only export async
// functions, and each caller supplies its own systemPrompt/persona rather
// than this hardcoding one voice for every feature.
export async function callGemini<T>(
  schema: z.ZodType<T>,
  systemPrompt: string,
  userPrompt: string,
): Promise<AiResult<T>> {
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(schema),
      },
    });

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== FinishReason.STOP && finishReason !== FinishReason.MAX_TOKENS) {
      return { status: "error", message: "The AI declined to respond to this request." };
    }

    const text = response.text;
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

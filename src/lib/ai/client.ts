import { ApiError, GoogleGenAI } from "@google/genai";

declare global {
  var geminiClientGlobal: GoogleGenAI | undefined;
}

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
      return "The AI service is temporarily overloaded — try again in a moment.";
    }
    return `AI request failed: ${error.message}`;
  }
  return "AI request failed unexpectedly.";
}

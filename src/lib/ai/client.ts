import { GoogleGenAI } from "@google/genai";

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

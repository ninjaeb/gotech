import Anthropic from "@anthropic-ai/sdk";

declare global {
  var anthropicClientGlobal: Anthropic | undefined;
}

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  if (!globalThis.anthropicClientGlobal) {
    globalThis.anthropicClientGlobal = new Anthropic();
  }
  return globalThis.anthropicClientGlobal;
}

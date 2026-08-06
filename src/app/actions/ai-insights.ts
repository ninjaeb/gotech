"use server";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient, isAiConfigured } from "@/lib/ai/client";
import { buildEntityContext, buildPipelineContext, type EntityRef } from "@/lib/ai/context";

const MODEL = "claude-opus-5";

export type AiResult<T> = { status: "ok"; data: T } | { status: "error"; message: string };

const NOT_CONFIGURED: AiResult<never> = {
  status: "error",
  message: "AI features aren't configured — set ANTHROPIC_API_KEY to enable them.",
};

function describeAiError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "AI request failed: check that ANTHROPIC_API_KEY is set correctly.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "AI request was rate-limited — try again in a moment.";
  }
  if (error instanceof Anthropic.APIError) {
    return `AI request failed: ${error.message}`;
  }
  return "AI request failed unexpectedly.";
}

const SYSTEM_PROMPT =
  "You are a sales assistant embedded in a CRM. Ground everything you write only in the context given — never invent names, numbers, or events that aren't present. If context is thin, say so plainly rather than guessing. Be terse and concrete.";

async function callClaude<T>(schema: z.ZodType<T>, userPrompt: string): Promise<AiResult<T>> {
  try {
    const client = getAnthropicClient();
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      output_config: { format: zodOutputFormat(schema) },
    });

    if (response.stop_reason === "refusal") {
      return { status: "error", message: "The AI declined to respond to this request." };
    }
    if (!response.parsed_output) {
      return { status: "error", message: "The model didn't return a usable response." };
    }
    return { status: "ok", data: response.parsed_output };
  } catch (error) {
    return { status: "error", message: describeAiError(error) };
  }
}

const InsightsSchema = z.object({
  summary: z
    .string()
    .describe(
      "A concise 2-3 sentence summary of the current state of this relationship, grounded only in the notes and activity provided.",
    ),
  nextAction: z
    .string()
    .describe("One concrete, specific recommended next action and rough timing, in one or two sentences."),
});
export type Insights = z.infer<typeof InsightsSchema>;

export async function generateInsights(ref: EntityRef): Promise<AiResult<Insights>> {
  if (!isAiConfigured()) return NOT_CONFIGURED;
  const context = await buildEntityContext(ref);
  if (!context) return { status: "error", message: "Couldn't find that record." };
  return callClaude(
    InsightsSchema,
    `Here is a CRM record and its history:\n\n${context.contextText}\n\nSummarize where things stand and recommend one specific next action.`,
  );
}

const FollowUpSchema = z.object({
  subject: z.string().describe("A short subject line for the follow-up, suitable for an email."),
  draft: z
    .string()
    .describe(
      "A friendly, professional follow-up message ready to send or lightly edit, referencing specific context from the notes and activity provided.",
    ),
});
export type FollowUpDraft = z.infer<typeof FollowUpSchema>;

export async function draftFollowUp(ref: EntityRef): Promise<AiResult<FollowUpDraft>> {
  if (!isAiConfigured()) return NOT_CONFIGURED;
  const context = await buildEntityContext(ref);
  if (!context) return { status: "error", message: "Couldn't find that record." };
  return callClaude(
    FollowUpSchema,
    `Here is a CRM record and its history:\n\n${context.contextText}\n\nDraft a short, friendly follow-up message to send next, referencing specific context.`,
  );
}

const PipelineInsightsSchema = z.object({
  summary: z
    .string()
    .describe(
      "A concise 2-3 sentence read on overall pipeline health, grounded only in the deals and tasks provided.",
    ),
  topPriority: z
    .string()
    .describe(
      "The single most urgent or highest-leverage thing to do next across the whole pipeline right now, in one or two sentences — name the specific deal or task involved.",
    ),
});
export type PipelineInsights = z.infer<typeof PipelineInsightsSchema>;

export async function generatePipelineInsights(): Promise<AiResult<PipelineInsights>> {
  if (!isAiConfigured()) return NOT_CONFIGURED;
  const contextText = await buildPipelineContext();
  return callClaude(
    PipelineInsightsSchema,
    `Here is the current state of the sales pipeline:\n\n${contextText}\n\nGive a short read on pipeline health and name the single highest-priority thing to do next.`,
  );
}

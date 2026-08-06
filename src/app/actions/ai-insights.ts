"use server";

import { ApiError, FinishReason } from "@google/genai";
import { z } from "zod";
import { getGeminiClient, isAiConfigured } from "@/lib/ai/client";
import { buildEntityContext, buildPipelineContext, type EntityRef } from "@/lib/ai/context";

const MODEL = "gemini-flash-latest";

export type AiResult<T> = { status: "ok"; data: T } | { status: "error"; message: string };

const NOT_CONFIGURED: AiResult<never> = {
  status: "error",
  message: "AI features aren't configured — set GEMINI_API_KEY to enable them.",
};

function describeAiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return "AI request failed: check that GEMINI_API_KEY is set correctly.";
    }
    if (error.status === 429) {
      return "AI request was rate-limited — try again in a moment.";
    }
    return `AI request failed: ${error.message}`;
  }
  return "AI request failed unexpectedly.";
}

const SYSTEM_PROMPT =
  "You are a sales assistant embedded in a CRM. Ground everything you write only in the context given — never invent names, numbers, or events that aren't present. If context is thin, say so plainly rather than guessing. Be terse and concrete.";

async function callGemini<T>(schema: z.ZodType<T>, userPrompt: string): Promise<AiResult<T>> {
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
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
  return callGemini(
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
  return callGemini(
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
  return callGemini(
    PipelineInsightsSchema,
    `Here is the current state of the sales pipeline:\n\n${contextText}\n\nGive a short read on pipeline health and name the single highest-priority thing to do next.`,
  );
}

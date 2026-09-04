"use server";

import { z } from "zod";
import { AI_NOT_CONFIGURED, callGemini, isAiConfigured, type AiResult } from "@/lib/ai/client";
import { buildEntityContext, buildPipelineContext, type EntityRef } from "@/lib/ai/context";

export type { AiResult };

const SYSTEM_PROMPT =
  "You are a sales assistant embedded in a CRM. Ground everything you write only in the context given — never invent names, numbers, or events that aren't present. If context is thin, say so plainly rather than guessing. Be terse and concrete.";

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
  if (!isAiConfigured()) return AI_NOT_CONFIGURED;
  const context = await buildEntityContext(ref);
  if (!context) return { status: "error", message: "Couldn't find that record." };
  return callGemini(
    InsightsSchema,
    SYSTEM_PROMPT,
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
  if (!isAiConfigured()) return AI_NOT_CONFIGURED;
  const context = await buildEntityContext(ref);
  if (!context) return { status: "error", message: "Couldn't find that record." };
  return callGemini(
    FollowUpSchema,
    SYSTEM_PROMPT,
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
  if (!isAiConfigured()) return AI_NOT_CONFIGURED;
  const contextText = await buildPipelineContext();
  return callGemini(
    PipelineInsightsSchema,
    SYSTEM_PROMPT,
    `Here is the current state of the sales pipeline:\n\n${contextText}\n\nGive a short read on pipeline health and name the single highest-priority thing to do next.`,
  );
}

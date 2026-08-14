import type { DealStage } from "@/generated/prisma/client";

export function hasScheduledNextStep(tasks: { completed: boolean; dueDate: Date | null }[]) {
  return tasks.some((task) => !task.completed && task.dueDate !== null);
}

export function needsFollowUp(deal: {
  stage: DealStage;
  tasks: { completed: boolean; dueDate: Date | null }[];
}) {
  return deal.stage !== "WON" && deal.stage !== "LOST" && !hasScheduledNextStep(deal.tasks);
}

// Stage-gate: cheap checks against incomplete records, run before a deal is
// allowed to advance to a given stage. Only WON is gated for now — LOST
// needs no paperwork trail, and gating early-funnel stages would just add
// friction to quick lead-logging without protecting anything.
export function stageGateError(
  deal: { value: number | string; companyId: string | null; contactId: string | null; quoteCount: number },
  nextStage: DealStage,
): string | null {
  if (nextStage !== "WON") return null;
  if (Number(deal.value) <= 0) return "Set a deal value before marking this Won.";
  if (!deal.companyId && !deal.contactId) return "Link a company or contact before marking this Won.";
  if (deal.quoteCount < 1) return "Attach a quote before marking this Won.";
  return null;
}

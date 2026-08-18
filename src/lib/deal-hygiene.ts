export function hasScheduledNextStep(tasks: { completed: boolean; dueDate: Date | null }[]) {
  return tasks.some((task) => !task.completed && task.dueDate !== null);
}

export function needsFollowUp(deal: {
  pipelineStage: { isWon: boolean; isLost: boolean };
  tasks: { completed: boolean; dueDate: Date | null }[];
}) {
  return !deal.pipelineStage.isWon && !deal.pipelineStage.isLost && !hasScheduledNextStep(deal.tasks);
}

// Stage-gate: cheap checks against incomplete records, run before a deal is
// allowed to advance to a given stage. Only a Won stage is gated for now —
// Lost needs no paperwork trail, and gating early-funnel stages would just
// add friction to quick lead-logging without protecting anything. This is
// pipeline-agnostic on purpose — whichever stage a pipeline marks isWon gets
// the same gate, not just one fixed "WON" enum value.
export function stageGateError(
  deal: { value: number | string; companyId: string | null; contactId: string | null; quoteCount: number },
  nextStage: { isWon: boolean },
): string | null {
  if (!nextStage.isWon) return null;
  if (Number(deal.value) <= 0) return "Set a deal value before marking this Won.";
  if (!deal.companyId && !deal.contactId) return "Link a company or contact before marking this Won.";
  if (deal.quoteCount < 1) return "Attach a quote before marking this Won.";
  return null;
}

export const ROTTING_THRESHOLD_DAYS = 14;

// "Days in stage" isn't a stored field — it's derived from the most recent
// STAGE_CHANGE activity (already logged by changeDealStage/updateDeal), or
// createdAt for a deal that's never moved out of the stage it was created
// in. Callers pass that one timestamp in rather than a full activity list,
// since it's cheap to select as just the latest STAGE_CHANGE row's
// createdAt in the query itself (see the Deals kanban page).
export function daysInStage(deal: { createdAt: Date; latestStageChangeAt: Date | null }): number {
  const enteredAt = deal.latestStageChangeAt ?? deal.createdAt;
  return Math.floor((Date.now() - enteredAt.getTime()) / 86_400_000);
}

export function isRotting(deal: {
  pipelineStage: { isWon: boolean; isLost: boolean };
  createdAt: Date;
  latestStageChangeAt: Date | null;
}): boolean {
  if (deal.pipelineStage.isWon || deal.pipelineStage.isLost) return false;
  return daysInStage(deal) >= ROTTING_THRESHOLD_DAYS;
}

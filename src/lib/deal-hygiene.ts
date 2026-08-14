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

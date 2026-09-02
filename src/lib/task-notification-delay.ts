// Allowed values for Settings → Integrations' task assignment notification
// delay — shared between the settings form (the <select> options) and the
// server action that validates a save, so the two can never drift apart.
// 0 means "send immediately".
export const TASK_ASSIGNMENT_DELAY_OPTIONS_MINUTES = [0, 15, 30, 60, 120, 180, 240, 300] as const;

export type TaskAssignmentDelayMinutes = (typeof TASK_ASSIGNMENT_DELAY_OPTIONS_MINUTES)[number];

// e.g. 0 -> "Immediately", 15 -> "15 minutes", 60 -> "1 hour", 120 -> "2 hours".
export function formatDelayLabel(minutes: number): string {
  if (minutes === 0) return "Immediately";
  if (minutes < 60) return `${minutes} minutes`;
  const hours = minutes / 60;
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

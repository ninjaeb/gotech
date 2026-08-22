// Cost isn't stored anywhere — it's derived from each TimeEntry's minutes
// and the logging user's hourlyRate at read time, so changing a rate
// retroactively reflects in past totals rather than needing a backfill.
export type BudgetTimeEntry = { minutes: number; user: { hourlyRate: unknown } };

export type ProjectActuals = {
  totalMinutes: number;
  totalCost: number;
  unratedMinutes: number;
};

export function computeProjectActuals(entries: BudgetTimeEntry[]): ProjectActuals {
  let totalMinutes = 0;
  let totalCost = 0;
  let unratedMinutes = 0;

  for (const entry of entries) {
    totalMinutes += entry.minutes;
    const rate = entry.user.hourlyRate;
    if (rate === null || rate === undefined) {
      unratedMinutes += entry.minutes;
    } else {
      totalCost += (entry.minutes / 60) * Number(rate);
    }
  }

  return { totalMinutes, totalCost, unratedMinutes };
}

export type BudgetSeverity = "ok" | "warning" | "over";

// Warn at 90% so a project shows amber before it actually tips over —
// matches the existing overdue-task color convention (green/amber/red).
export function budgetSeverity(actual: number, budget: number | null): BudgetSeverity {
  if (budget === null || budget <= 0) return "ok";
  const ratio = actual / budget;
  if (ratio >= 1) return "over";
  if (ratio >= 0.9) return "warning";
  return "ok";
}

export function timelineSeverity(targetCompletionDate: Date | null, status: string): BudgetSeverity {
  if (!targetCompletionDate || status === "COMPLETED") return "ok";
  const daysRemaining = (targetCompletionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
  if (daysRemaining < 0) return "over";
  if (daysRemaining <= 3) return "warning";
  return "ok";
}

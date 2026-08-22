"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateProjectBudget } from "@/app/actions/projects";
import { Input, Label } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatMinutes } from "@/lib/format";
import { budgetSeverity, type BudgetSeverity } from "@/lib/project-budget";
import { cn } from "@/lib/utils";

const SEVERITY_BAR: Record<BudgetSeverity, string> = {
  ok: "bg-emerald-500",
  warning: "bg-amber-500",
  over: "bg-rose-500",
};
const SEVERITY_TEXT: Record<BudgetSeverity, string> = {
  ok: "text-slate-500 dark:text-slate-400",
  warning: "text-amber-600 dark:text-amber-400",
  over: "text-rose-600 dark:text-rose-400",
};

export function ProjectBudgetPanel({
  projectId,
  status,
  budgetHours,
  budgetAmount,
  targetCompletionDate,
  daysRemaining,
  timeSeverity,
  totalMinutes,
  totalCost,
  unratedMinutes,
  currency,
  canManage = true,
}: {
  projectId: string;
  status: string;
  budgetHours: number | null;
  budgetAmount: number | null;
  targetCompletionDate: string | null;
  daysRemaining: number | null;
  timeSeverity: BudgetSeverity;
  totalMinutes: number;
  totalCost: number;
  unratedMinutes: number;
  currency: string;
  // Developers see the timeline but not hours/cost budget, and can't edit
  // any of it — budget is admin-only, everywhere else this stays true.
  canManage?: boolean;
}) {
  const noBudgetSet = budgetHours === null && budgetAmount === null && targetCompletionDate === null;
  const [editing, setEditing] = useState(canManage && noBudgetSet);
  const [pending, startTransition] = useTransition();

  const totalHours = totalMinutes / 60;

  if (editing && canManage) {
    return (
      <form
        action={(formData) => {
          startTransition(async () => {
            await updateProjectBudget(projectId, formData);
            setEditing(false);
          });
        }}
        className="grid gap-3 sm:grid-cols-3"
      >
        <div>
          <Label htmlFor="budgetHours">Budget hours</Label>
          <Input
            id="budgetHours"
            name="budgetHours"
            type="number"
            min="0"
            step="1"
            defaultValue={budgetHours ?? ""}
            placeholder="e.g. 80"
          />
        </div>
        <div>
          <Label htmlFor="budgetAmount">Budget amount ({currency})</Label>
          <Input
            id="budgetAmount"
            name="budgetAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={budgetAmount ?? ""}
            placeholder="e.g. 5000"
          />
        </div>
        <div>
          <Label htmlFor="targetCompletionDate">Target completion</Label>
          <DatePicker id="targetCompletionDate" name="targetCompletionDate" defaultValue={targetCompletionDate ?? ""} />
        </div>
        <div className="flex items-center gap-2 sm:col-span-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save budget"}
          </Button>
          {!noBudgetSet && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {canManage && budgetHours !== null && (
        <BudgetRow
          label="Hours"
          actualLabel={formatMinutes(totalMinutes)}
          budgetLabel={`of ${budgetHours}h budgeted`}
          ratio={Math.min(1, totalHours / budgetHours)}
          severity={budgetSeverity(totalHours, budgetHours)}
        />
      )}
      {canManage && budgetAmount !== null && (
        <BudgetRow
          label="Cost"
          actualLabel={formatCurrency(totalCost, currency)}
          budgetLabel={`of ${formatCurrency(budgetAmount, currency)} budgeted`}
          ratio={Math.min(1, totalCost / budgetAmount)}
          severity={budgetSeverity(totalCost, budgetAmount)}
        />
      )}
      {canManage && unratedMinutes > 0 && (
        <p className="text-xs text-slate-400">
          {formatMinutes(unratedMinutes)} logged by team members with no hourly rate set — not included in cost.
        </p>
      )}
      {!canManage && !targetCompletionDate && (
        <p className="text-sm text-slate-500 dark:text-slate-400">No timeline set yet.</p>
      )}
      {targetCompletionDate && (
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Timeline</p>
          <p className={cn("mt-1 text-sm font-medium", SEVERITY_TEXT[timeSeverity])}>
            {status === "COMPLETED"
              ? "Completed"
              : daysRemaining !== null && daysRemaining < 0
                ? `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} overdue`
                : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`}
            <span className="ml-1.5 font-normal text-slate-400">— target {formatDate(targetCompletionDate)}</span>
          </p>
        </div>
      )}
      {canManage && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <Pencil className="h-3 w-3" />
          Edit budget
        </button>
      )}
    </div>
  );
}

function BudgetRow({
  label,
  actualLabel,
  budgetLabel,
  ratio,
  severity,
}: {
  label: string;
  actualLabel: string;
  budgetLabel: string;
  ratio: number;
  severity: BudgetSeverity;
}) {
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className={cn("text-xs font-medium", SEVERITY_TEXT[severity])}>
          {actualLabel} <span className="font-normal text-slate-400">{budgetLabel}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
        <div className={cn("h-full rounded-full transition-all", SEVERITY_BAR[severity])} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

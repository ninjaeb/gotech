import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import type { Company, Contact, Deal, Task } from "@/generated/prisma/client";
import { deleteTask, toggleTaskComplete } from "@/app/actions/tasks";
import { TASK_TYPE_LABELS } from "@/lib/labels";
import { relativeToToday, fullName } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { cn } from "@/lib/utils";

export type TaskWithRelations = Task & {
  contact?: Pick<Contact, "id" | "firstName" | "lastName"> | null;
  company?: Pick<Company, "id" | "name"> | null;
  deal?: Pick<Deal, "id" | "title"> | null;
};

export function TaskList({
  tasks,
  showParent = false,
  emptyMessage = "No tasks yet.",
}: {
  tasks: TaskWithRelations[];
  showParent?: boolean;
  emptyMessage?: string;
}) {
  if (tasks.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
      {tasks.map((task) => {
        const overdue =
          !task.completed && task.dueDate && new Date(task.dueDate) < new Date();
        const dueLabel = relativeToToday(task.dueDate);

        return (
          <li key={task.id} className="flex items-start gap-3 py-3">
            <form action={toggleTaskComplete.bind(null, task.id)}>
              <button
                type="submit"
                aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  task.completed
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 hover:border-indigo-500 dark:border-neutral-600",
                )}
              >
                {task.completed && (
                  <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                    <path
                      d="M2.5 6.5L4.5 8.5L9.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </form>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={cn(
                    "text-sm font-medium text-slate-800 dark:text-slate-200",
                    task.completed && "text-slate-400 line-through dark:text-slate-500",
                  )}
                >
                  {task.title}
                </p>
                <Badge>{TASK_TYPE_LABELS[task.type]}</Badge>
                {dueLabel && (
                  <span
                    className={cn(
                      "text-xs font-medium",
                      overdue
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-400 dark:text-slate-500",
                    )}
                  >
                    {overdue ? "Overdue: " : ""}
                    {dueLabel}
                  </span>
                )}
              </div>
              {task.description && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {task.description}
                </p>
              )}
              {showParent && (task.contact || task.company || task.deal) && (
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                  {task.contact && (
                    <Link
                      href={`/contacts/${task.contact.id}`}
                      className="hover:text-indigo-600 hover:underline"
                    >
                      {fullName(task.contact.firstName, task.contact.lastName)}
                    </Link>
                  )}
                  {task.company && (
                    <Link
                      href={`/companies/${task.company.id}`}
                      className="hover:text-indigo-600 hover:underline"
                    >
                      {task.company.name}
                    </Link>
                  )}
                  {task.deal && (
                    <Link
                      href={`/deals/${task.deal.id}`}
                      className="hover:text-indigo-600 hover:underline"
                    >
                      {task.deal.title}
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Link
                href={`/tasks/${task.id}/edit`}
                aria-label="Edit task"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-neutral-800 dark:hover:text-slate-200"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <form action={deleteTask.bind(null, task.id)}>
                <ConfirmSubmitButton
                  confirmMessage="Delete this task?"
                  variant="ghost"
                  size="sm"
                  className="!px-1.5 text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </ConfirmSubmitButton>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

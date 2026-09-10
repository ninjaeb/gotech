import Link from "next/link";
import { CheckSquare, Plus } from "lucide-react";
import { requireCompletePartnerProfile } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { togglePartnerTaskCompleted } from "@/app/actions/partner-tasks";
import { relativeToToday } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function PartnerTasksPage() {
  const user = await requireCompletePartnerProfile();
  const tasks = await db.partnerTask.findMany({
    where: { partnerId: user.id },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
    include: { company: { select: { id: true, name: true } }, contact: { select: { id: true, firstName: true, lastName: true } }, deal: { select: { id: true, title: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description={`${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`}
        actions={
          <Link href="/business-portal/tasks/new" className={buttonClasses()}>
            <Plus className="h-4 w-4" />
            New task
          </Link>
        }
      />

      <Card>
        <CardBody>
          {tasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No tasks yet."
              description="Keep track of follow-ups against your companies, contacts, and deals."
              action={
                <Link href="/business-portal/tasks/new" className={buttonClasses()}>
                  <Plus className="h-4 w-4" />
                  New task
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {tasks.map((task) => {
                const overdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date();
                const dueLabel = relativeToToday(task.dueDate);
                const parent = task.company ?? task.contact ?? task.deal;
                const parentLabel = task.company?.name ?? (task.contact ? `${task.contact.firstName} ${task.contact.lastName ?? ""}`.trim() : task.deal?.title);
                const parentHref = task.company
                  ? `/business-portal/companies/${task.company.id}`
                  : task.contact
                    ? `/business-portal/contacts/${task.contact.id}`
                    : task.deal
                      ? `/business-portal/deals/${task.deal.id}`
                      : undefined;

                return (
                  <li key={task.id} className="flex items-start gap-3 py-3">
                    <form action={togglePartnerTaskCompleted.bind(null, task.id)}>
                      <button type="submit" aria-label={task.completed ? "Mark incomplete" : "Mark complete"}>
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            task.completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-petrol dark:border-neutral-600",
                          )}
                        >
                          {task.completed && (
                            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                              <path d="M2.5 6.5L4.5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                      </button>
                    </form>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/business-portal/tasks/${task.id}`}
                          className={cn(
                            "text-sm font-medium text-slate-800 hover:text-petrol hover:underline dark:text-slate-200",
                            task.completed && "text-slate-400 line-through dark:text-slate-500",
                          )}
                        >
                          {task.title}
                        </Link>
                        {dueLabel && (
                          <span className={cn("text-xs font-medium", overdue ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500")}>
                            {overdue ? "Overdue: " : ""}
                            {dueLabel}
                          </span>
                        )}
                      </div>
                      {parent && parentHref && parentLabel && (
                        <Link href={parentHref} className="mt-1 inline-block text-xs text-slate-400 hover:text-petrol dark:hover:text-petrol-light">
                          {parentLabel}
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

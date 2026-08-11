import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { TaskList } from "@/components/tasks/task-list";
import { GlobalTaskForm } from "@/components/tasks/global-task-form";
import { cn } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Due today" },
  { key: "completed", label: "Completed" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function buildWhere(filter: FilterKey): Prisma.TaskWhereInput {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  switch (filter) {
    case "overdue":
      return { completed: false, dueDate: { lt: startOfToday } };
    case "today":
      return {
        completed: false,
        dueDate: { gte: startOfToday, lt: endOfToday },
      };
    case "completed":
      return { completed: true };
    case "open":
    default:
      return { completed: false };
  }
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter: FilterKey = FILTERS.some((f) => f.key === rawFilter)
    ? (rawFilter as FilterKey)
    : "open";

  const [tasks, companies, contacts, deals] = await Promise.all([
    db.task.findMany({
      where: buildWhere(filter),
      orderBy:
        filter === "completed"
          ? { completedAt: "desc" }
          : [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true } },
      },
    }),
    db.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.contact.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, companyId: true },
    }),
    db.deal.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, title: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Tasks" description="Follow-ups and to-dos across your CRM" />

      <Card className="mb-6">
        <CardBody>
          <GlobalTaskForm companies={companies} contacts={contacts} deals={deals} />
        </CardBody>
      </Card>

      <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-neutral-800">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "open" ? "/tasks" : `/tasks?filter=${f.key}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              filter === f.key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardBody>
          <TaskList
            tasks={tasks}
            showParent
            emptyMessage={
              filter === "completed"
                ? "No completed tasks yet."
                : "Nothing here — you're all caught up."
            }
          />
        </CardBody>
      </Card>
    </div>
  );
}

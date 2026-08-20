import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
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

function tabHref(key: FilterKey, query?: string) {
  const params = new URLSearchParams();
  if (key !== "open") params.set("filter", key);
  if (query) params.set("q", query);
  const qs = params.toString();
  return qs ? `/tasks?${qs}` : "/tasks";
}

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
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { filter: rawFilter, q } = await searchParams;
  const filter: FilterKey = FILTERS.some((f) => f.key === rawFilter)
    ? (rawFilter as FilterKey)
    : "open";
  const query = q?.trim();

  const where: Prisma.TaskWhereInput = query
    ? {
        AND: [
          buildWhere(filter),
          { OR: [{ title: { contains: query } }, { description: { contains: query } }] },
        ],
      }
    : buildWhere(filter);

  const [tasks, companies, contacts, deals, users] = await Promise.all([
    db.task.findMany({
      where,
      orderBy:
        filter === "completed"
          ? { completedAt: "desc" }
          : [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
        assignees: { include: { user: { select: { id: true, name: true } } } },
        _count: { select: { followers: true } },
      },
    }),
    db.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.contact.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, companyId: true },
    }),
    db.deal.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, companyId: true, contactId: true },
    }),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Tasks" description="Follow-ups and to-dos across your CRM" />

      <Card className="mb-6">
        <CardBody>
          <GlobalTaskForm companies={companies} contacts={contacts} deals={deals} users={users} />
        </CardBody>
      </Card>

      <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-neutral-800">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={tabHref(f.key, query)}
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

      <form className="mb-4">
        {filter !== "open" && <input type="hidden" name="filter" value={filter} />}
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search tasks…"
            className="pl-9"
          />
        </div>
      </form>

      <Card>
        <CardBody>
          <TaskList
            tasks={tasks}
            users={users}
            showParent
            emptyMessage={
              query
                ? "No tasks match your search."
                : filter === "completed"
                  ? "No completed tasks yet."
                  : "Nothing here — you're all caught up."
            }
          />
        </CardBody>
      </Card>
    </div>
  );
}

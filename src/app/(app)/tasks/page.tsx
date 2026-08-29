import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { TaskList } from "@/components/tasks/task-list";
import { GlobalTaskForm } from "@/components/tasks/global-task-form";
import { AssigneeFilterSelect } from "@/components/tasks/assignee-filter-select";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/dal";
import type { Prisma } from "@/generated/prisma/client";

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "due", label: "Overdue & today" },
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Due today" },
  { key: "completed", label: "Completed" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

// `assigneeParam` is `undefined` to omit the URL param entirely (the
// implicit "defaults to me" state — see assigneeExplicit below) and any
// string, including "", to set it explicitly (an explicit "All assignees"
// is `assignee=`, not an absent param, so it doesn't quietly revert to the
// default when navigating between tabs).
function tabHref(key: FilterKey, query?: string, assigneeParam?: string) {
  const params = new URLSearchParams();
  if (key !== "open") params.set("filter", key);
  if (query) params.set("q", query);
  if (assigneeParam !== undefined) params.set("assignee", assigneeParam);
  const qs = params.toString();
  return qs ? `/tasks?${qs}` : "/tasks";
}

function buildWhere(filter: FilterKey): Prisma.TaskWhereInput {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  switch (filter) {
    // Overdue and due-today combined, in one filter rather than two — what
    // the daily task digest (email and WhatsApp) actually reports counts
    // for, so its link can land here instead of the broader "Open" tab.
    case "due":
      return { completed: false, dueDate: { lt: endOfToday } };
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
  searchParams: Promise<{ filter?: string; q?: string; assignee?: string }>;
}) {
  const currentUser = await getCurrentUser();
  const canManage = currentUser.role === "ADMIN";
  const { filter: rawFilter, q, assignee } = await searchParams;
  const filter: FilterKey = FILTERS.some((f) => f.key === rawFilter)
    ? (rawFilter as FilterKey)
    : "open";
  const query = q?.trim();
  // Defaults to the viewer's own tasks the first time they land here with
  // no assignee choice made yet (e.g. from the sidebar) — "assignee" only
  // stays absent from the URL until the select is touched, since even
  // picking "All assignees" submits it as an explicit empty value.
  const assigneeExplicit = assignee !== undefined;
  const assigneeId = assigneeExplicit ? assignee.trim() || undefined : currentUser.id;

  const conditions: Prisma.TaskWhereInput[] = [buildWhere(filter)];
  if (query) {
    conditions.push({ OR: [{ title: { contains: query } }, { description: { contains: query } }] });
  }
  if (assigneeId === "unassigned") {
    conditions.push({ assignees: { none: {} } });
  } else if (assigneeId) {
    conditions.push({ assignees: { some: { userId: assigneeId } } });
  }
  const where: Prisma.TaskWhereInput = conditions.length > 1 ? { AND: conditions } : conditions[0];

  const contactSelect = { id: true, firstName: true, lastName: true, email: true, phone: true } as const;

  const [tasks, companies, contacts, deals, users, hasEmailAccount, hasWhatsAppAccount] = await Promise.all([
    db.task.findMany({
      where,
      orderBy:
        filter === "completed"
          ? { completedAt: "desc" }
          : [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      include: {
        contact: { select: contactSelect },
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true, contact: { select: contactSelect } } },
        project: {
          select: { id: true, name: true, deal: { select: { id: true, title: true, contact: { select: contactSelect } } } },
        },
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
    db.emailAccount.findUnique({ where: { userId: currentUser.id }, select: { id: true } }).then(Boolean),
    db.whatsAppAccount.findUnique({ where: { id: "singleton" }, select: { id: true } }).then(Boolean),
  ]);

  return (
    <div>
      <PageHeader title="Tasks" description="Follow-ups and to-dos across your CRM" />

      {canManage && (
        <Card className="mb-6">
          <CardBody>
            <GlobalTaskForm companies={companies} contacts={contacts} deals={deals} users={users} />
          </CardBody>
        </Card>
      )}

      <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-neutral-800">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={tabHref(f.key, query, assigneeExplicit ? (assigneeId ?? "") : undefined)}
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

      <form className="mb-4 flex flex-wrap items-center gap-2">
        {filter !== "open" && <input type="hidden" name="filter" value={filter} />}
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search tasks…"
            className="pl-9"
          />
        </div>
        <AssigneeFilterSelect users={users} defaultValue={assigneeId} />
      </form>

      <Card>
        <CardBody>
          <TaskList
            tasks={tasks}
            users={users}
            showParent
            canManage={canManage}
            hasEmailAccount={hasEmailAccount}
            hasWhatsAppAccount={hasWhatsAppAccount}
            emptyMessage={
              query || (assigneeExplicit && assigneeId)
                ? "No tasks match your filters."
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

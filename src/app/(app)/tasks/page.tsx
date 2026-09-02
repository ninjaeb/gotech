import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { GlobalTaskForm } from "@/components/tasks/global-task-form";
import { TasksFilterPanel } from "@/components/tasks/tasks-filter-panel";
import { FILTERS, type FilterKey } from "@/lib/task-filters";
import { getCurrentUser } from "@/lib/auth/dal";
import type { Prisma } from "@/generated/prisma/client";

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

  // Text search itself happens client-side (TasksFilterPanel), across more
  // fields than a DB query could cheaply cover (company, contact, deal,
  // project, assignee names) — `query` here only seeds that component's
  // initial value and carries the text across tab/assignee navigations.
  const conditions: Prisma.TaskWhereInput[] = [buildWhere(filter)];
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

      <TasksFilterPanel
        tasks={tasks}
        users={users}
        canManage={canManage}
        hasEmailAccount={hasEmailAccount}
        hasWhatsAppAccount={hasWhatsAppAccount}
        filter={filter}
        initialQuery={query}
        assigneeExplicit={assigneeExplicit}
        assigneeId={assigneeId}
        emptyMessage={
          assigneeExplicit && assigneeId
            ? "No tasks match your filters."
            : filter === "completed"
              ? "No completed tasks yet."
              : "Nothing here — you're all caught up."
        }
      />
    </div>
  );
}

import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { GlobalTaskForm } from "@/components/tasks/global-task-form";
import { TasksFilterPanel } from "@/components/tasks/tasks-filter-panel";
import { FILTERS, isSortKey, type FilterKey, type SortKey } from "@/lib/task-filters";
import { getCurrency } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/dal";
import type { Prisma } from "@/generated/prisma/client";

// A plain, unsigned amount with up to 2 decimals — same shape MONEY_RE in
// src/lib/documents/money.ts enforces for a document line, so a value
// pasted into this filter can never reach the query as anything but a
// number Prisma's Decimal comparison understands.
const MIN_DEAL_VALUE_RE = /^\d{1,12}(\.\d{1,2})?$/;

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

// "due" (the default) keeps today's exact behaviour, including the
// completed tab's own completedAt ordering; an explicit Priority or Deal
// value choice always wins instead, on every tab — a sort you picked on
// purpose shouldn't quietly revert just because you're looking at
// Completed. Deal value can't be expressed as a single Prisma orderBy
// (it's the *highest* value among a task's linked deals, a to-many
// relation), so that case orders by due date here and gets re-sorted in
// JS afterwards — see `sortByDealValue` below.
function buildOrderBy(
  filter: FilterKey,
  sort: SortKey,
): Prisma.TaskOrderByWithRelationInput | Prisma.TaskOrderByWithRelationInput[] {
  if (sort === "priority") return [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }];
  if (filter === "completed") return { completedAt: "desc" };
  return [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }];
}

function maxDealValue(task: { deals: { deal: { value: Prisma.Decimal } }[] }): number {
  if (task.deals.length === 0) return -1; // sorts after every task that actually has a deal
  return Math.max(...task.deals.map((link) => Number(link.deal.value)));
}

// Array.prototype.sort is a stable sort (guaranteed since ES2019), so ties
// keep whatever order the DB query already produced (due date, then
// priority, then recency) instead of shuffling on every render.
function sortByDealValue<T extends { deals: { deal: { value: Prisma.Decimal } }[] }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => maxDealValue(b) - maxDealValue(a));
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; assignee?: string; sort?: string; minDealValue?: string }>;
}) {
  const currentUser = await getCurrentUser();
  // Tasks are cross-functional — every real staff role manages its own;
  // Partner is the only role excluded, and it never reaches this page.
  const canManage = currentUser.role !== "PARTNER";
  const { filter: rawFilter, q, assignee, sort: rawSort, minDealValue: rawMinDealValue } = await searchParams;
  const filter: FilterKey = FILTERS.some((f) => f.key === rawFilter)
    ? (rawFilter as FilterKey)
    : "open";
  const sort: SortKey = isSortKey(rawSort) ? rawSort : "due";
  const query = q?.trim();
  const minDealValue = rawMinDealValue?.trim() && MIN_DEAL_VALUE_RE.test(rawMinDealValue.trim()) ? rawMinDealValue.trim() : undefined;
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
  if (minDealValue) {
    conditions.push({ deals: { some: { deal: { value: { gte: Number(minDealValue) } } } } });
  }
  const where: Prisma.TaskWhereInput = conditions.length > 1 ? { AND: conditions } : conditions[0];

  const contactSelect = { id: true, firstName: true, lastName: true, email: true, phone: true } as const;

  const [rawTasks, companies, contacts, deals, users, currency, hasEmailAccount, hasWhatsAppAccount] = await Promise.all([
    db.task.findMany({
      where,
      orderBy: buildOrderBy(filter, sort),
      include: {
        contact: { select: contactSelect },
        company: { select: { id: true, name: true } },
        deals: { include: { deal: { select: { id: true, title: true, value: true, contact: { select: contactSelect } } } } },
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
      select: { id: true, title: true, value: true, companyId: true, contactId: true },
    }),
    // Assignees/followers, the assignee filter, and the @mention list
    // inside a task's description are all staff only: a Partner has no
    // task list or CRM inbox of their own to see any of them land in, same
    // reasoning as team-member-row.tsx's own notification toggles.
    db.user.findMany({ where: { role: { not: "PARTNER" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getCurrency(),
    db.emailAccount.findUnique({ where: { userId: currentUser.id }, select: { id: true } }).then(Boolean),
    db.whatsAppAccount.findUnique({ where: { id: "singleton" }, select: { id: true } }).then(Boolean),
  ]);
  const tasks = sort === "dealValue" ? sortByDealValue(rawTasks) : rawTasks;

  return (
    <div>
      <PageHeader title="Tasks" description="Follow-ups and to-dos across your CRM" />

      {canManage && (
        <Card className="mb-6">
          <CardBody>
            <GlobalTaskForm
              companies={companies}
              contacts={contacts}
              deals={deals.map((deal) => ({ ...deal, value: deal.value.toString() }))}
              users={users}
              currency={currency}
            />
          </CardBody>
        </Card>
      )}

      <TasksFilterPanel
        tasks={tasks}
        users={users}
        currency={currency}
        canManage={canManage}
        hasEmailAccount={hasEmailAccount}
        hasWhatsAppAccount={hasWhatsAppAccount}
        filter={filter}
        sort={sort}
        minDealValue={minDealValue}
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

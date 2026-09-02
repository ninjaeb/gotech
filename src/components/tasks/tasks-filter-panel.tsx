"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/field";
import { Card, CardBody } from "@/components/ui/card";
import { TaskList, type TaskWithRelations } from "@/components/tasks/task-list";
import { AssigneeFilterSelect } from "@/components/tasks/assignee-filter-select";
import { TASK_PRIORITY_LABELS, TASK_TYPE_LABELS } from "@/lib/labels";
import { fullName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FILTERS, tabHref, type FilterKey } from "@/lib/task-filters";
import type { UserOption } from "@/lib/mentions";

// Everything shown in a task row (and a few things that aren't, like type/
// priority) folded into one lowercased blob, so the search box reaches
// company, contact, deal/project, and assignee names — not just the task's
// own title/description.
function searchableText(task: TaskWithRelations): string {
  const contact = task.contact ?? task.deal?.contact ?? task.project?.deal?.contact ?? null;
  return [
    task.title,
    task.description,
    TASK_TYPE_LABELS[task.type],
    TASK_PRIORITY_LABELS[task.priority],
    task.company?.name,
    contact ? fullName(contact.firstName, contact.lastName) : null,
    task.deal?.title,
    task.project?.name,
    task.project?.deal?.title,
    ...(task.assignees?.map((a) => a.user.name) ?? []),
  ]
    .filter(Boolean)
    .join("   ")
    .toLowerCase();
}

export function TasksFilterPanel({
  tasks,
  users,
  canManage,
  hasEmailAccount,
  hasWhatsAppAccount,
  filter,
  initialQuery = "",
  assigneeExplicit,
  assigneeId,
  emptyMessage,
}: {
  tasks: TaskWithRelations[];
  users: UserOption[];
  canManage: boolean;
  hasEmailAccount: boolean;
  hasWhatsAppAccount: boolean;
  filter: FilterKey;
  initialQuery?: string;
  assigneeExplicit: boolean;
  assigneeId?: string;
  emptyMessage: string;
}) {
  const [query, setQuery] = useState(initialQuery);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((task) => searchableText(task).includes(q));
  }, [tasks, query]);

  return (
    <div>
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-neutral-800">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={tabHref(f.key, query, assigneeExplicit ? (assigneeId ?? "") : undefined)}
            className={cn(
              "shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
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
        {/* Mirrors the live query so changing the assignee (which submits
            this form and reloads with a fresh server-filtered task set)
            carries the current search text forward instead of losing it. */}
        <input type="hidden" name="q" value={query} />
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks, companies, contacts…"
            className="pl-9"
          />
        </div>
        <AssigneeFilterSelect users={users} defaultValue={assigneeId} />
      </form>

      <Card>
        <CardBody>
          <TaskList
            tasks={filtered}
            users={users}
            showParent
            canManage={canManage}
            hasEmailAccount={hasEmailAccount}
            hasWhatsAppAccount={hasWhatsAppAccount}
            emptyMessage={query.trim() ? "No tasks match your search." : emptyMessage}
          />
        </CardBody>
      </Card>
    </div>
  );
}

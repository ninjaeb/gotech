import Link from "next/link";
import { Clock, Pencil, Trash2, User as UserIcon, Users } from "lucide-react";
import type { Company, Contact, Deal, Project, Task, User } from "@/generated/prisma/client";
import { deleteTask, toggleTaskComplete } from "@/app/actions/tasks";
import { TASK_PRIORITY_BADGE_CLASSES, TASK_PRIORITY_LABELS, TASK_TYPE_LABELS } from "@/lib/labels";
import { relativeToToday, fullName } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { ActivityContent } from "@/components/activity/activity-content";
import { SendEmailButton } from "@/components/contacts/send-email-button";
import { SendWhatsAppButton } from "@/components/contacts/send-whatsapp-button";
import type { UserOption } from "@/lib/mentions";
import { cn } from "@/lib/utils";

// email/phone are optional here (not just nullable) so callers that don't
// need the send-email/WhatsApp buttons can keep selecting just id/name
// without breaking this type — only the dashboard and /tasks page, which
// do render those buttons, select the fuller shape.
type ContactRef = Pick<Contact, "id" | "firstName" | "lastName"> & Partial<Pick<Contact, "email" | "phone">>;
type DealRef = Pick<Deal, "id" | "title"> & { contact?: ContactRef | null };

export type TaskWithRelations = Task & {
  contact?: ContactRef | null;
  company?: Pick<Company, "id" | "name"> | null;
  deal?: DealRef | null;
  project?: (Pick<Project, "id" | "name"> & { deal?: DealRef | null }) | null;
  assignees?: { user: Pick<User, "id" | "name"> }[];
  _count?: { followers: number };
};

// MySQL sorts NULL as the lowest value, so `ORDER BY dueDate ASC` puts
// undated tasks first — the opposite of what people expect (a task with no
// date isn't more urgent than one that's actually due). Re-sort here,
// after the DB query, rather than in every caller: keep whatever grouping
// the query already established (e.g. open before completed), and within
// each group move undated tasks after dated ones, otherwise leaving the
// query's own order (priority, then recency) untouched.
function compareTasksForDisplay(a: TaskWithRelations, b: TaskWithRelations): number {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  return Number(a.dueDate === null) - Number(b.dueDate === null);
}

export function TaskList({
  tasks,
  users = [],
  showParent = false,
  emptyMessage = "No tasks yet.",
  canManage = true,
  hasEmailAccount = false,
  hasWhatsAppAccount = false,
}: {
  tasks: TaskWithRelations[];
  users?: UserOption[];
  showParent?: boolean;
  emptyMessage?: string;
  // Developers can log time against tasks but not create/edit/delete/
  // complete them — everywhere else this defaults to true unchanged.
  canManage?: boolean;
  // Whether the *current user* has a connected mailbox, and whether the
  // team has a connected WhatsApp Business number — gates the per-row
  // Send buttons the same way the task detail page gates its own. Default
  // false rather than checking here: callers that don't select the extra
  // contact/deal/project fields ContactRef needs shouldn't pay for a query
  // whose result they'd never render anyway.
  hasEmailAccount?: boolean;
  hasWhatsAppAccount?: boolean;
}) {
  if (tasks.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {emptyMessage}
      </p>
    );
  }

  const sortedTasks = [...tasks].sort(compareTasksForDisplay);

  return (
    <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
      {sortedTasks.map((task) => {
        const overdue =
          !task.completed && task.dueDate && new Date(task.dueDate) < new Date();
        const dueLabel = relativeToToday(task.dueDate);
        // Same resolution as the task detail page: whichever contact this
        // task is actually about, direct link first, falling back through
        // its deal or project.
        const clientContact = task.contact ?? task.deal?.contact ?? task.project?.deal?.contact ?? null;
        const clientName = clientContact ? fullName(clientContact.firstName, clientContact.lastName) : "";

        return (
          <li key={task.id} className="flex items-start gap-3 py-3">
            {(() => {
              const indicator = (
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    task.completed
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-300 dark:border-neutral-600",
                    canManage && !task.completed && "hover:border-indigo-500",
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
                </span>
              );
              if (!canManage) return indicator;
              return (
                <form action={toggleTaskComplete.bind(null, task.id)}>
                  <button type="submit" aria-label={task.completed ? "Mark incomplete" : "Mark complete"}>
                    {indicator}
                  </button>
                </form>
              );
            })()}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/tasks/${task.id}`}
                  className={cn(
                    "text-sm font-medium text-slate-800 hover:text-indigo-600 hover:underline dark:text-slate-200",
                    task.completed && "text-slate-400 line-through dark:text-slate-500",
                  )}
                >
                  {task.title}
                </Link>
                <Badge>{TASK_TYPE_LABELS[task.type]}</Badge>
                <Badge className={TASK_PRIORITY_BADGE_CLASSES[task.priority]}>
                  {TASK_PRIORITY_LABELS[task.priority]}
                </Badge>
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
                {!!task.assignees?.length && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <UserIcon className="h-3 w-3" />
                    {task.assignees.map((a) => a.user.name).join(", ")}
                  </span>
                )}
                {!!task._count?.followers && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <Users className="h-3 w-3" />
                    {task._count.followers}
                  </span>
                )}
              </div>
              {task.description && (
                <ActivityContent
                  text={task.description}
                  users={users}
                  className="mt-1 text-sm text-slate-500 dark:text-slate-400"
                />
              )}
              {showParent && (task.contact || task.company || task.deal || task.project) && (
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
                  {task.project && (
                    <Link
                      href={`/projects/${task.project.id}`}
                      className="hover:text-indigo-600 hover:underline"
                    >
                      {task.project.name}
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {canManage && hasEmailAccount && clientContact?.email && (
                <SendEmailButton contactId={clientContact.id} contactName={clientName} taskId={task.id} />
              )}
              {canManage && hasWhatsAppAccount && clientContact?.phone && (
                <SendWhatsAppButton contactId={clientContact.id} contactName={clientName} taskId={task.id} />
              )}
              <Link
                href={`/tasks/${task.id}/time`}
                aria-label="Log time"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-neutral-800 dark:hover:text-slate-200"
              >
                <Clock className="h-4 w-4" />
              </Link>
              {canManage && (
                <>
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
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

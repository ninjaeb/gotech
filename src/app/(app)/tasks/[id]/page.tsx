import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, Clock, Pencil, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteTask, toggleTaskComplete } from "@/app/actions/tasks";
import { getCurrentUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Linkify } from "@/components/ui/linkify";
import { AttachmentPreview } from "@/components/activity/attachment-preview";
import { MailLink, WhatsAppLink } from "@/components/ui/channel-links";
import { SendEmailButton } from "@/components/contacts/send-email-button";
import { SendWhatsAppButton } from "@/components/contacts/send-whatsapp-button";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { ActivityForm } from "@/components/activity/activity-form";
import {
  TASK_PRIORITY_BADGE_CLASSES,
  TASK_PRIORITY_LABELS,
  TASK_TYPE_BADGE_CLASSES,
  TASK_TYPE_LABELS,
} from "@/lib/labels";
import { formatDate, formatMinutes, fullName } from "@/lib/format";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const canManage = currentUser.role === "ADMIN";

  const contactSelect = { id: true, firstName: true, lastName: true, email: true, phone: true } as const;

  const [task, timeLogged, users, hasEmailAccount, hasWhatsAppAccount] = await Promise.all([
    db.task.findUnique({
      where: { id },
      include: {
        contact: { select: contactSelect },
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true, contact: { select: contactSelect } } },
        project: {
          select: { id: true, name: true, deal: { select: { id: true, title: true, contact: { select: contactSelect } } } },
        },
        assignees: { include: { user: { select: { id: true, name: true } } } },
        followers: { include: { user: { select: { id: true, name: true } } } },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { attachments: { select: { id: true, fileName: true, mimeType: true } } },
        },
        attachments: { select: { id: true, fileName: true, mimeType: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    db.timeEntry.aggregate({ where: { taskId: id }, _sum: { minutes: true } }),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.emailAccount.findUnique({ where: { userId: currentUser.id }, select: { id: true } }).then(Boolean),
    db.whatsAppAccount.findUnique({ where: { id: "singleton" }, select: { id: true } }).then(Boolean),
  ]);
  if (!task) notFound();

  const totalMinutes = timeLogged._sum.minutes ?? 0;
  const overdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date();

  // "The client" for the send-email/WhatsApp buttons — whichever contact
  // this task is actually about. A direct link wins; otherwise fall back
  // through the deal or project's own contact, since a task can be linked
  // to those without a contact set directly on it.
  const clientContact = task.contact ?? task.deal?.contact ?? task.project?.deal?.contact ?? null;
  const clientSection = (() => {
    if (!clientContact) return null;
    const name = fullName(clientContact.firstName, clientContact.lastName);
    return (
      <span className="inline-flex items-center gap-1.5">
        <Link href={`/contacts/${clientContact.id}`} className="text-indigo-600 hover:underline">
          {name}
        </Link>
        {clientContact.email && <MailLink email={clientContact.email} />}
        {clientContact.phone && <WhatsAppLink phone={clientContact.phone} />}
        {canManage && hasEmailAccount && clientContact.email && (
          <SendEmailButton contactId={clientContact.id} contactName={name} taskId={task.id} />
        )}
        {canManage && hasWhatsAppAccount && clientContact.phone && (
          <SendWhatsAppButton contactId={clientContact.id} contactName={name} taskId={task.id} />
        )}
      </span>
    );
  })();

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Tasks", href: "/tasks" }, { label: task.title }]}
        title={task.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge className={TASK_TYPE_BADGE_CLASSES[task.type]}>{TASK_TYPE_LABELS[task.type]}</Badge>
            <Badge className={TASK_PRIORITY_BADGE_CLASSES[task.priority]}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </Badge>
            {task.completed ? (
              <span className="text-emerald-600 dark:text-emerald-400">Completed</span>
            ) : task.dueDate ? (
              <span className={overdue ? "text-rose-600 dark:text-rose-400" : undefined}>
                {overdue ? "Overdue — due" : "Due"} {formatDate(task.dueDate)}
              </span>
            ) : (
              <span>No due date</span>
            )}
          </span>
        }
        actions={
          canManage && (
            <>
              <form action={toggleTaskComplete.bind(null, task.id)}>
                <button type="submit" className={buttonClasses("secondary")}>
                  {task.completed ? <Circle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {task.completed ? "Mark incomplete" : "Mark complete"}
                </button>
              </form>
              <Link href={`/tasks/${task.id}/edit`} className={buttonClasses("secondary")}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
              <form action={deleteTask.bind(null, task.id)}>
                <ConfirmSubmitButton confirmMessage="Delete this task? This can't be undone.">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </ConfirmSubmitButton>
              </form>
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <Link
                href={`/tasks/${task.id}/time`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
              >
                <Clock className="h-3.5 w-3.5" />
                {totalMinutes > 0 ? `${formatMinutes(totalMinutes)} logged` : "Log time"}
              </Link>
            </CardHeader>
            <CardBody className="space-y-4">
              {task.description && (
                <Linkify text={task.description} className="text-sm text-slate-700 dark:text-slate-300" />
              )}
              {task.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {task.attachments.map((attachment) => (
                    <AttachmentPreview key={attachment.id} attachment={attachment} />
                  ))}
                </div>
              )}

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <DetailRow label="Company" value={task.company?.name} href={task.company ? `/companies/${task.company.id}` : undefined} />
                <DetailRow label="Contact" value={clientSection} />
                <DetailRow label="Deal" value={task.deal?.title} href={task.deal ? `/deals/${task.deal.id}` : undefined} />
                <DetailRow
                  label="Project"
                  value={task.project?.name}
                  href={task.project ? `/projects/${task.project.id}` : undefined}
                />
                <DetailRow
                  label="Assignees"
                  value={task.assignees.length > 0 ? task.assignees.map((a) => a.user.name).join(", ") : null}
                />
                <DetailRow
                  label="Followers"
                  value={task.followers.length > 0 ? task.followers.map((f) => f.user.name).join(", ") : null}
                />
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <ActivityForm taskId={task.id} users={users} />
              <ActivityFeed activities={task.activities} users={users} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      {href && value ? (
        <Link href={href} className="mt-0.5 block text-indigo-600 hover:underline">
          {value}
        </Link>
      ) : (
        // A div, not a p — value can carry the SendEmailButton/SendWhatsAppButton
        // modal (a <div role="dialog"> with its own <h2>/<form>/<p>), which
        // isn't valid inside a <p> and breaks the DOM once that modal opens.
        <div className="mt-0.5 text-slate-800 dark:text-slate-200">{value ?? "—"}</div>
      )}
    </div>
  );
}

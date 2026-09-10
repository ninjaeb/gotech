import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deletePartnerTask, togglePartnerTaskCompleted } from "@/app/actions/partner-tasks";
import { requireCompletePartnerProfile } from "@/lib/auth/dal";
import { formatDate, fullName } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";

export default async function PartnerTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCompletePartnerProfile();
  const { id } = await params;
  const task = await db.partnerTask.findFirst({
    where: { id, partnerId: user.id },
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
    },
  });
  if (!task) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Tasks", href: "/business-portal/tasks" }, { label: task.title }]}
        title={task.title}
        description={task.completed ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30">Completed</Badge> : undefined}
        actions={
          <>
            <form action={togglePartnerTaskCompleted.bind(null, task.id)}>
              <Button type="submit" variant="secondary">
                {task.completed ? "Mark incomplete" : "Mark complete"}
              </Button>
            </form>
            <Link href={`/business-portal/tasks/${task.id}/edit`} className={buttonClasses("secondary")}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <form action={deletePartnerTask.bind(null, task.id)}>
              <ConfirmSubmitButton confirmMessage="Delete this task?">
                <Trash2 className="h-4 w-4" />
                Delete
              </ConfirmSubmitButton>
            </form>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
          <DetailRow label="Due date" value={task.dueDate ? formatDate(task.dueDate) : null} />
          <DetailRow
            label="Company"
            value={task.company && <Link href={`/business-portal/companies/${task.company.id}`} className="hover:text-petrol dark:hover:text-petrol-light">{task.company.name}</Link>}
          />
          <DetailRow
            label="Contact"
            value={task.contact && <Link href={`/business-portal/contacts/${task.contact.id}`} className="hover:text-petrol dark:hover:text-petrol-light">{fullName(task.contact.firstName, task.contact.lastName)}</Link>}
          />
          <DetailRow
            label="Deal"
            value={task.deal && <Link href={`/business-portal/deals/${task.deal.id}`} className="hover:text-petrol dark:hover:text-petrol-light">{task.deal.title}</Link>}
          />
          {task.description && (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Description</p>
              <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{task.description}</p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-slate-800 dark:text-slate-200">{value || "—"}</p>
    </div>
  );
}

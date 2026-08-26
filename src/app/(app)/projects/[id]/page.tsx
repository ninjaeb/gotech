import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteProject } from "@/app/actions/projects";
import { deleteInvoice } from "@/app/actions/invoices";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { ActivityForm } from "@/components/activity/activity-form";
import { TaskList } from "@/components/tasks/task-list";
import { TaskQuickForm } from "@/components/tasks/task-quick-form";
import { ProjectStatusSelect } from "@/components/projects/project-status-select";
import { InvoiceStatusSelect } from "@/components/invoices/invoice-status-select";
import { ProjectBudgetPanel } from "@/components/projects/project-budget-panel";
import { PROJECT_STATUS_BADGE_CLASSES, PROJECT_STATUS_LABELS } from "@/lib/labels";
import { formatCurrency, formatDate, formatDateInput, formatMinutes, fullName } from "@/lib/format";
import { getCurrency } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/dal";
import { computeProjectActuals, timelineSeverity } from "@/lib/project-budget";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const canManage = currentUser.role === "ADMIN";

  const [currency, project, timeLogged, users] = await Promise.all([
    getCurrency(),
    db.project.findUnique({
      where: { id },
      include: {
        deal: { include: { company: true, contact: true } },
        tasks: {
          orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { priority: "desc" }],
          include: {
            assignees: { include: { user: { select: { id: true, name: true } } } },
            _count: { select: { followers: true } },
          },
        },
        activities: { orderBy: { createdAt: "desc" }, take: 30 },
        invoices: { orderBy: { createdAt: "desc" } },
      },
    }),
    db.timeEntry.findMany({
      where: { task: { projectId: id } },
      select: { minutes: true, user: { select: { hourlyRate: true } } },
    }),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!project) notFound();
  const { totalMinutes, totalCost, unratedMinutes } = computeProjectActuals(timeLogged);
  const daysRemaining = project.targetCompletionDate
    ? Math.ceil((project.targetCompletionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const timeSeverity = timelineSeverity(project.targetCompletionDate, project.status);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: project.name }]}
        title={project.name}
        description={
          <Link href={`/deals/${project.deal.id}`} className="text-indigo-600 hover:underline">
            From deal: {project.deal.title}
          </Link>
        }
        actions={
          canManage && (
            <form action={deleteProject.bind(null, project.id)}>
              <ConfirmSubmitButton confirmMessage="Delete this project? Its milestone tasks and activity go with it.">
                <Trash2 className="h-4 w-4" />
                Delete
              </ConfirmSubmitButton>
            </form>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</p>
                <div className="mt-1">
                  {canManage ? (
                    <ProjectStatusSelect projectId={project.id} status={project.status} />
                  ) : (
                    <Badge className={PROJECT_STATUS_BADGE_CLASSES[project.status]}>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </Badge>
                  )}
                </div>
              </div>
              <DetailRow label="Deal value" value={formatCurrency(project.deal.value.toString(), currency)} />
              <DetailRow
                label="Company"
                value={project.deal.company?.name ?? null}
                href={project.deal.company ? `/companies/${project.deal.company.id}` : undefined}
              />
              <DetailRow
                label="Contact"
                value={
                  project.deal.contact
                    ? fullName(project.deal.contact.firstName, project.deal.contact.lastName)
                    : null
                }
                href={project.deal.contact ? `/contacts/${project.deal.contact.id}` : undefined}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget &amp; Timeline</CardTitle>
            </CardHeader>
            <CardBody>
              <ProjectBudgetPanel
                projectId={project.id}
                canManage={canManage}
                status={project.status}
                budgetHours={project.budgetHours}
                budgetAmount={project.budgetAmount === null ? null : Number(project.budgetAmount)}
                targetCompletionDate={project.targetCompletionDate ? formatDateInput(project.targetCompletionDate) : null}
                daysRemaining={daysRemaining}
                timeSeverity={timeSeverity}
                totalMinutes={totalMinutes}
                totalCost={totalCost}
                unratedMinutes={unratedMinutes}
                currency={currency}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
              {totalMinutes > 0 && <Badge>{formatMinutes(totalMinutes)} logged</Badge>}
            </CardHeader>
            <CardBody>
              <TaskList tasks={project.tasks} users={users} canManage={canManage} emptyMessage="No milestones yet." />
              {canManage && (
                <TaskQuickForm projectId={project.id} users={users} defaultAssigneeId={currentUser.id} />
              )}
            </CardBody>
          </Card>

          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle>Invoices ({project.invoices.length})</CardTitle>
                <Link href={`/projects/${project.id}/invoices/new`} className={buttonClasses("secondary", "sm")}>
                  <Plus className="h-4 w-4" />
                  New invoice
                </Link>
              </CardHeader>
              <CardBody>
                {project.invoices.length === 0 ? (
                  <EmptyState title="No invoices yet." />
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
                    {project.invoices.map((invoice) => (
                      <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <Link
                            href={`/projects/${project.id}/invoices/${invoice.id}/edit`}
                            className="truncate font-medium text-slate-800 hover:text-indigo-600 dark:text-slate-200"
                          >
                            {invoice.title}
                          </Link>
                          <p className="text-xs text-slate-400">
                            {formatCurrency(invoice.amount.toString(), currency)}
                            {invoice.dueDate && ` · Due ${formatDate(invoice.dueDate)}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <InvoiceStatusSelect invoiceId={invoice.id} status={invoice.status} />
                          <form action={deleteInvoice.bind(null, invoice.id)}>
                            <ConfirmSubmitButton
                              confirmMessage="Delete this invoice?"
                              variant="ghost"
                              size="sm"
                              className="!px-1.5 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <ActivityForm projectId={project.id} users={users} />
              <ActivityFeed activities={project.activities} users={users} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null;
  href?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      {href && value ? (
        <Link href={href} className="mt-0.5 block text-indigo-600 hover:underline">
          {value}
        </Link>
      ) : (
        <p className="mt-0.5 text-slate-800 dark:text-slate-200">{value || "—"}</p>
      )}
    </div>
  );
}

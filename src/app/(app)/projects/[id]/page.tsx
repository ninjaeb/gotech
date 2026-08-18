import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteProject } from "@/app/actions/projects";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { ActivityForm } from "@/components/activity/activity-form";
import { TaskList } from "@/components/tasks/task-list";
import { TaskQuickForm } from "@/components/tasks/task-quick-form";
import { ProjectStatusSelect } from "@/components/projects/project-status-select";
import { formatCurrency, formatMinutes, fullName } from "@/lib/format";
import { getCurrency } from "@/lib/settings";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [currency, project, timeLogged] = await Promise.all([
    getCurrency(),
    db.project.findUnique({
      where: { id },
      include: {
        deal: { include: { company: true, contact: true } },
        tasks: { orderBy: [{ completed: "asc" }, { dueDate: "asc" }] },
        activities: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    }),
    db.timeEntry.aggregate({ where: { task: { projectId: id } }, _sum: { minutes: true } }),
  ]);

  if (!project) notFound();
  const totalMinutes = timeLogged._sum.minutes ?? 0;

  return (
    <div>
      <PageHeader
        title={project.name}
        description={
          <Link href={`/deals/${project.deal.id}`} className="text-indigo-600 hover:underline">
            From deal: {project.deal.title}
          </Link>
        }
        actions={
          <form action={deleteProject.bind(null, project.id)}>
            <ConfirmSubmitButton confirmMessage="Delete this project? Its milestone tasks and activity go with it.">
              <Trash2 className="h-4 w-4" />
              Delete
            </ConfirmSubmitButton>
          </form>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</p>
                <div className="mt-1">
                  <ProjectStatusSelect projectId={project.id} status={project.status} />
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
              <CardTitle>Milestones</CardTitle>
              {totalMinutes > 0 && <Badge>{formatMinutes(totalMinutes)} logged</Badge>}
            </CardHeader>
            <CardBody>
              <TaskList tasks={project.tasks} emptyMessage="No milestones yet." />
              <TaskQuickForm projectId={project.id} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <ActivityForm projectId={project.id} />
              <ActivityFeed activities={project.activities} />
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

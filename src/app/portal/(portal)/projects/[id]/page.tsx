import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentClientUser } from "@/lib/portal/dal";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PROJECT_STATUS_BADGE_CLASSES, PROJECT_STATUS_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

// Read-only for the client — milestone tasks only (never every task on the
// project, which can carry internal-only follow-ups), and no description
// field, which staff may use for internal notes.
export default async function PortalProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clientUser = await getCurrentClientUser();

  const project = await db.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      deal: { select: { companyId: true } },
      tasks: {
        where: { type: "MILESTONE" },
        orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
        select: { id: true, title: true, dueDate: true, completed: true },
      },
    },
  });

  if (!project || project.deal.companyId !== clientUser.companyId) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader title={project.name} />

      <Card className="mb-6">
        <CardBody className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Status</span>
          <Badge className={PROJECT_STATUS_BADGE_CLASSES[project.status]}>
            {PROJECT_STATUS_LABELS[project.status]}
          </Badge>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
        </CardHeader>
        <CardBody>
          {project.tasks.length === 0 ? (
            <EmptyState title="No milestones yet." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {project.tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                      task.completed
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 dark:border-neutral-600",
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
                  <span
                    className={cn(
                      "flex-1 text-slate-800 dark:text-slate-200",
                      task.completed && "text-slate-400 line-through dark:text-slate-500",
                    )}
                  >
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <span className="shrink-0 text-xs text-slate-400">{formatDate(task.dueDate)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

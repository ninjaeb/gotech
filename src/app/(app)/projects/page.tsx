import Link from "next/link";
import { AlertTriangle, FolderKanban } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PROJECT_STATUS_BADGE_CLASSES, PROJECT_STATUS_LABELS } from "@/lib/labels";
import { fullName } from "@/lib/format";
import { computeProjectActuals, budgetSeverity, timelineSeverity } from "@/lib/project-budget";

export default async function ProjectsPage() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      deal: { include: { company: true, contact: true } },
      tasks: {
        select: { completed: true, timeEntries: { select: { minutes: true, user: { select: { hourlyRate: true } } } } },
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Projects"
        description={`${projects.length} ${projects.length === 1 ? "project" : "projects"} — spun up automatically when a deal is won`}
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Mark a deal Won and its delivery project shows up here automatically, pre-loaded with milestone tasks."
        />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
            {projects.map((project) => {
              const doneCount = project.tasks.filter((task) => task.completed).length;
              const { totalMinutes, totalCost } = computeProjectActuals(project.tasks.flatMap((task) => task.timeEntries));
              const overHours = budgetSeverity(totalMinutes / 60, project.budgetHours) === "over";
              const overCost = budgetSeverity(totalCost, project.budgetAmount === null ? null : Number(project.budgetAmount)) === "over";
              const overTimeline =
                timelineSeverity(project.targetCompletionDate, project.status) === "over";
              const flagged = overHours || overCost || overTimeline;

              return (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-neutral-800/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {project.name}
                      </p>
                      <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                        {project.deal.company?.name ??
                          (project.deal.contact
                            ? fullName(project.deal.contact.firstName, project.deal.contact.lastName)
                            : "No company")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                      {flagged && (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400"
                          title={[
                            overHours && "Over budgeted hours",
                            overCost && "Over budgeted cost",
                            overTimeline && "Past target completion date",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Over budget</span>
                        </span>
                      )}
                      <span className="hidden md:inline">
                        {doneCount}/{project.tasks.length} milestones
                      </span>
                      <Badge className={PROJECT_STATUS_BADGE_CLASSES[project.status]}>
                        {PROJECT_STATUS_LABELS[project.status]}
                      </Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

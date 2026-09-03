import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deletePipeline } from "@/app/actions/pipelines";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { NewPipelineForm } from "@/components/settings/new-pipeline-form";
import { SetDefaultPipelineButton } from "@/components/settings/set-default-pipeline-button";

export default async function PipelinesPage() {
  const pipelines = await db.pipeline.findMany({
    orderBy: { sortOrder: "asc" },
    include: { stages: true, _count: { select: { deals: true } } },
  });

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Pipelines" }]}
        title="Pipelines"
        description="Each deal type can carry its own stage list instead of sharing one kanban."
      />
      <Card>
        <CardBody className="space-y-4">
          <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
            {pipelines.map((pipeline) => (
              <li key={pipeline.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate font-medium text-slate-800 dark:text-slate-200">
                    {pipeline.name}
                    {pipeline.isDefault && (
                      <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {pipeline.stages.length} {pipeline.stages.length === 1 ? "stage" : "stages"} ·{" "}
                    {pipeline._count.deals} {pipeline._count.deals === 1 ? "deal" : "deals"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!pipeline.isDefault && <SetDefaultPipelineButton pipelineId={pipeline.id} />}
                  <Link
                    href={`/settings/pipelines/${pipeline.id}`}
                    title="Edit stages"
                    aria-label="Edit stages"
                    className={buttonClasses("secondary", "sm")}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                  {!pipeline.isDefault && pipeline._count.deals === 0 && (
                    <form action={deletePipeline.bind(null, pipeline.id)}>
                      <ConfirmSubmitButton confirmMessage={`Delete the "${pipeline.name}" pipeline?`} size="sm">
                        <Trash2 className="h-3.5 w-3.5" />
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <NewPipelineForm />
        </CardBody>
      </Card>
    </div>
  );
}

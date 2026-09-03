import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PipelineStagesForm } from "@/components/settings/pipeline-stages-form";
import { RenamePipelineForm } from "@/components/settings/rename-pipeline-form";
import { SetDefaultPipelineButton } from "@/components/settings/set-default-pipeline-button";

export default async function EditPipelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pipeline = await db.pipeline.findUnique({
    where: { id },
    include: { stages: { orderBy: { sortOrder: "asc" } } },
  });
  if (!pipeline) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Pipelines", href: "/settings/pipelines" },
          { label: pipeline.name },
        ]}
        title={pipeline.name}
      />

      <Card>
        <CardHeader>
          <CardTitle>Name</CardTitle>
        </CardHeader>
        <CardBody>
          <RenamePipelineForm pipelineId={pipeline.id} name={pipeline.name} />
          {!pipeline.isDefault && (
            <div className="mt-3">
              <SetDefaultPipelineButton pipelineId={pipeline.id} variant="labelled" />
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stages</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Mark exactly one stage Won and one Lost — gates, the deal-rotting flag, and Deal → Project
            handoff all key off those flags instead of a stage&apos;s name.
          </p>
          <PipelineStagesForm pipelineId={pipeline.id} stages={pipeline.stages} />
        </CardBody>
      </Card>
    </div>
  );
}

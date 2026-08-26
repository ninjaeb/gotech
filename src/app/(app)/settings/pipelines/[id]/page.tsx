import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { db } from "@/lib/db";
import { renamePipeline, setDefaultPipeline } from "@/app/actions/pipelines";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { Button, buttonClasses } from "@/components/ui/button";
import { PipelineStagesForm } from "@/components/settings/pipeline-stages-form";
import { cn } from "@/lib/utils";

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
    <div className="max-w-2xl space-y-6">
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
          <form action={renamePipeline.bind(null, pipeline.id)} className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="name">Pipeline name</Label>
              <Input id="name" name="name" defaultValue={pipeline.name} required />
            </div>
            <Button type="submit">Save</Button>
          </form>
          {!pipeline.isDefault && (
            <form action={setDefaultPipeline.bind(null, pipeline.id)} className="mt-3">
              <button type="submit" className={cn(buttonClasses("secondary", "sm"))}>
                <Star className="h-3.5 w-3.5" />
                Set as default pipeline
              </button>
            </form>
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

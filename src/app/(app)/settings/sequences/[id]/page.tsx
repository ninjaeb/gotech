import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateSequence } from "@/app/actions/sequences";
import { SequenceForm } from "@/components/settings/sequence-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";

export default async function EditSequencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sequence = await db.sequence.findUnique({
    where: { id },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
  if (!sequence) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Sequences", href: "/settings/sequences" },
          { label: sequence.name },
        ]}
        title={sequence.name}
      />
      <Card>
        <CardBody>
          <SequenceForm action={updateSequence.bind(null, sequence.id)} sequence={sequence} submitLabel="Save changes" />
        </CardBody>
      </Card>
    </div>
  );
}

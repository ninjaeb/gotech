import { createSequence } from "@/app/actions/sequences";
import { SequenceForm } from "@/components/settings/sequence-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";

export default function NewSequencePage() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Settings", href: "/system/settings" },
          { label: "Sequences", href: "/system/settings/sequences" },
          { label: "New sequence" },
        ]}
        title="New sequence"
      />
      <Card>
        <CardBody>
          <SequenceForm action={createSequence} submitLabel="Create sequence" />
        </CardBody>
      </Card>
    </div>
  );
}

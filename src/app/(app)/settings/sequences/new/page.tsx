import { createSequence } from "@/app/actions/sequences";
import { SequenceForm } from "@/components/settings/sequence-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";

export default function NewSequencePage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="New sequence" />
      <Card>
        <CardBody>
          <SequenceForm action={createSequence} submitLabel="Create sequence" />
        </CardBody>
      </Card>
    </div>
  );
}

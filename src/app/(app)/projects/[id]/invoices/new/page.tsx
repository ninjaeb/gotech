import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { createInvoice } from "@/app/actions/invoices";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } });
  if (!project) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader title="New invoice" description={`For ${project.name}`} />
      <Card>
        <CardBody>
          <InvoiceForm action={createInvoice.bind(null, projectId)} submitLabel="Create invoice" />
        </CardBody>
      </Card>
    </div>
  );
}

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateInvoice } from "@/app/actions/invoices";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/dal";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string; invoiceId: string }>;
}) {
  await requireAdmin();
  const { id: projectId, invoiceId } = await params;

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId, projectId },
    include: { project: { select: { name: true } } },
  });
  if (!invoice) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: invoice.project.name, href: `/projects/${projectId}` },
          { label: "Edit" },
        ]}
        title={`Edit ${invoice.title}`}
      />
      <Card>
        <CardBody>
          <InvoiceForm
            action={updateInvoice.bind(null, invoice.id)}
            invoice={{ ...invoice, amount: Number(invoice.amount) }}
            submitLabel="Save changes"
          />
        </CardBody>
      </Card>
    </div>
  );
}

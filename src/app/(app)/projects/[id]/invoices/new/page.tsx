import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { createInvoice } from "@/app/actions/invoices";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/dal";

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id: projectId } = await params;

  const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } });
  if (!project) notFound();

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "New invoice" },
        ]}
        title="New invoice"
        description={`For ${project.name}`}
      />
      <Card>
        <CardBody>
          <InvoiceForm action={createInvoice.bind(null, projectId)} submitLabel="Create invoice" />
        </CardBody>
      </Card>
    </div>
  );
}

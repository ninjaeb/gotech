import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateQuoteTemplate } from "@/app/actions/quote-templates";
import { QuoteForm } from "@/components/quotes/quote-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { getCurrency } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth/dal";

export default async function EditQuoteTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [currency, template, servicePackages] = await Promise.all([
    getCurrency(),
    db.quoteTemplate.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    db.servicePackage.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!template) notFound();

  const servicePackageOptions = servicePackages.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    unitPrice: Number(pkg.unitPrice),
  }));
  const templateDraft = {
    title: template.name,
    notes: template.notes,
    items: template.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      servicePackageId: item.servicePackageId,
    })),
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Quote templates", href: "/settings/quote-templates" },
          { label: template.name },
        ]}
        title={template.name}
      />
      <Card>
        <CardBody>
          <QuoteForm
            action={updateQuoteTemplate.bind(null, template.id)}
            quote={templateDraft}
            servicePackages={servicePackageOptions}
            currency={currency}
            submitLabel="Save changes"
            titleLabel="Template name"
            titlePlaceholder="Website — Standard package"
            notesLabel="Default terms (optional)"
          />
        </CardBody>
      </Card>
    </div>
  );
}

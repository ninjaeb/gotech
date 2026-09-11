import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateQuoteTemplate } from "@/app/actions/quote-templates";
import { LineItemsForm } from "@/components/documents/line-items-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { getBillingSettings } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth/dal";
import { loadCatalogOptions } from "@/lib/documents/catalog";
import { toLineItemsDraft } from "@/lib/documents/view-model";

export default async function EditQuoteTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [settings, template, catalog] = await Promise.all([
    getBillingSettings(),
    db.quoteTemplate.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } } } }),
    loadCatalogOptions(),
  ]);
  if (!template) notFound();

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Settings", href: "/system/settings" },
          { label: "Quote templates", href: "/system/settings/quote-templates" },
          { label: template.name },
        ]}
        title={template.name}
      />
      <Card>
        <CardBody>
          <LineItemsForm
            action={updateQuoteTemplate.bind(null, template.id)}
            mode="template"
            draft={{ title: template.name, notes: template.notes, items: toLineItemsDraft(template.items) }}
            catalog={catalog}
            currency={settings.currency}
            taxLabel={settings.taxLabel}
            taxRate={settings.taxRate}
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

import { createQuoteTemplate } from "@/app/actions/quote-templates";
import { LineItemsForm } from "@/components/documents/line-items-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { getBillingSettings } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth/dal";
import { loadCatalogOptions } from "@/lib/documents/catalog";

export default async function NewQuoteTemplatePage() {
  await requireAdmin();
  const [settings, catalog] = await Promise.all([getBillingSettings(), loadCatalogOptions()]);

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Settings", href: "/system/settings" },
          { label: "Quote templates", href: "/system/settings/quote-templates" },
          { label: "New template" },
        ]}
        title="New quote template"
      />
      <Card>
        <CardBody>
          <LineItemsForm
            action={createQuoteTemplate}
            mode="template"
            catalog={catalog}
            currency={settings.currency}
            taxLabel={settings.taxLabel}
            taxRate={settings.taxRate}
            submitLabel="Create template"
            titleLabel="Template name"
            titlePlaceholder="Website — Standard package"
            notesLabel="Default terms (optional)"
          />
        </CardBody>
      </Card>
    </div>
  );
}

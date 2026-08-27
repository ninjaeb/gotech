import { db } from "@/lib/db";
import { createQuoteTemplate } from "@/app/actions/quote-templates";
import { QuoteForm } from "@/components/quotes/quote-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { getCurrency } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth/dal";

export default async function NewQuoteTemplatePage() {
  await requireAdmin();
  const [currency, servicePackages] = await Promise.all([
    getCurrency(),
    db.servicePackage.findMany({ orderBy: { name: "asc" } }),
  ]);

  const servicePackageOptions = servicePackages.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    unitPrice: Number(pkg.unitPrice),
  }));

  return (
    <div className="max-w-2xl">
      <PageHeader
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Quote templates", href: "/settings/quote-templates" },
          { label: "New template" },
        ]}
        title="New quote template"
      />
      <Card>
        <CardBody>
          <QuoteForm
            action={createQuoteTemplate}
            servicePackages={servicePackageOptions}
            currency={currency}
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

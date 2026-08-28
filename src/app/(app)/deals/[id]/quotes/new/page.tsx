import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { createQuote } from "@/app/actions/quotes";
import { QuoteForm } from "@/components/quotes/quote-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { getCurrency } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth/dal";

export default async function NewQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id: dealId } = await params;

  const [currency, deal, servicePackages, quoteTemplates] = await Promise.all([
    getCurrency(),
    db.deal.findUnique({ where: { id: dealId }, select: { id: true, title: true } }),
    db.servicePackage.findMany({
      orderBy: { name: "asc" },
      include: { components: { include: { product: true }, orderBy: { sortOrder: "asc" } } },
    }),
    db.quoteTemplate.findMany({
      orderBy: { name: "asc" },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  if (!deal) notFound();

  const servicePackageOptions = servicePackages.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    unitPrice: Number(pkg.unitPrice),
    components: pkg.components.map((c) => ({
      servicePackageId: c.product.id,
      description: c.product.description ? `${c.product.name} — ${c.product.description}` : c.product.name,
      unitPrice: Number(c.product.unitPrice),
      quantity: Number(c.quantity),
    })),
  }));
  const quoteTemplateOptions = quoteTemplates.map((template) => ({
    id: template.id,
    name: template.name,
    notes: template.notes,
    items: template.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      servicePackageId: item.servicePackageId,
    })),
  }));

  return (
    <div className="max-w-2xl">
      <PageHeader
        breadcrumbs={[
          { label: "Deals", href: "/deals" },
          { label: deal.title, href: `/deals/${deal.id}` },
          { label: "New quote" },
        ]}
        title="New quote"
        description={`For ${deal.title}`}
      />
      <Card>
        <CardBody>
          <QuoteForm
            action={createQuote.bind(null, dealId)}
            servicePackages={servicePackageOptions}
            quoteTemplates={quoteTemplateOptions}
            currency={currency}
            submitLabel="Create quote"
          />
        </CardBody>
      </Card>
    </div>
  );
}

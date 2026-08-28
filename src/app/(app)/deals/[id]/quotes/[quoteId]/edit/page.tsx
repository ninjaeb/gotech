import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateQuote } from "@/app/actions/quotes";
import { QuoteForm } from "@/components/quotes/quote-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { getCurrency } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth/dal";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string; quoteId: string }>;
}) {
  await requireAdmin();
  const { id: dealId, quoteId } = await params;

  const [currency, quote, servicePackages] = await Promise.all([
    getCurrency(),
    db.quote.findUnique({
      where: { id: quoteId, dealId },
      include: { items: { orderBy: { sortOrder: "asc" } }, deal: { select: { title: true } } },
    }),
    db.servicePackage.findMany({
      orderBy: { name: "asc" },
      include: { components: { include: { product: true }, orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  if (!quote) notFound();

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
  const quoteDraft = {
    title: quote.title,
    notes: quote.notes,
    items: quote.items.map((item) => ({
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
          { label: "Deals", href: "/deals" },
          { label: quote.deal.title, href: `/deals/${dealId}` },
          { label: quote.title, href: `/deals/${dealId}/quotes/${quoteId}` },
          { label: "Edit" },
        ]}
        title="Edit quote"
        description={quote.title}
      />
      <Card>
        <CardBody>
          <QuoteForm
            action={updateQuote.bind(null, quote.id)}
            quote={quoteDraft}
            servicePackages={servicePackageOptions}
            currency={currency}
            submitLabel="Save changes"
          />
        </CardBody>
      </Card>
    </div>
  );
}

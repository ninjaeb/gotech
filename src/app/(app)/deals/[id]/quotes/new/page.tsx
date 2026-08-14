import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { createQuote } from "@/app/actions/quotes";
import { QuoteForm } from "@/components/quotes/quote-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { getCurrency } from "@/lib/settings";

export default async function NewQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: dealId } = await params;

  const [currency, deal, servicePackages] = await Promise.all([
    getCurrency(),
    db.deal.findUnique({ where: { id: dealId }, select: { id: true, title: true } }),
    db.servicePackage.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!deal) notFound();

  const servicePackageOptions = servicePackages.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    unitPrice: Number(pkg.unitPrice),
  }));

  return (
    <div className="max-w-2xl">
      <PageHeader title="New quote" description={`For ${deal.title}`} />
      <Card>
        <CardBody>
          <QuoteForm
            action={createQuote.bind(null, dealId)}
            servicePackages={servicePackageOptions}
            currency={currency}
            submitLabel="Create quote"
          />
        </CardBody>
      </Card>
    </div>
  );
}

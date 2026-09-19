import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { logExternalQuote } from "@/app/actions/quotes";
import { LogExternalQuoteForm } from "@/components/quotes/log-external-quote-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { getCurrency } from "@/lib/settings";
import { requireSales } from "@/lib/auth/dal";

export default async function LogExternalQuotePage({ params }: { params: Promise<{ id: string }> }) {
  await requireSales();
  const { id: dealId } = await params;

  const [deal, currency] = await Promise.all([
    db.deal.findUnique({ where: { id: dealId }, select: { id: true, title: true } }),
    getCurrency(),
  ]);
  if (!deal) notFound();

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Deals", href: "/system/deals" },
          { label: deal.title, href: `/system/deals/${deal.id}` },
          { label: "Log external quote" },
        ]}
        title="Log external quote"
        description={`For ${deal.title} — a quote already sent outside the CRM (email, another tool, a signed PO). This records it so the deal can still be marked Won.`}
      />
      <Card>
        <CardBody>
          <LogExternalQuoteForm action={logExternalQuote.bind(null, dealId)} currency={currency} />
        </CardBody>
      </Card>
    </div>
  );
}

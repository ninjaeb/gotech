import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { createQuote } from "@/app/actions/quotes";
import { LineItemsForm } from "@/components/documents/line-items-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { getBillingSettings } from "@/lib/settings";
import { requireSales } from "@/lib/auth/dal";
import { loadCatalogOptions, loadQuoteContacts, loadTemplateOptions } from "@/lib/documents/catalog";
import { addDays, orgToday, toDateInput } from "@/lib/documents/dates";
import { billToDefaults } from "@/lib/documents/snapshots";

export default async function NewQuotePage({ params }: { params: Promise<{ id: string }> }) {
  await requireSales();
  const { id: dealId } = await params;

  const [settings, deal, catalog, templates] = await Promise.all([
    getBillingSettings(),
    db.deal.findUnique({
      where: { id: dealId },
      select: { id: true, title: true, contactId: true, companyId: true, contact: true, company: true },
    }),
    loadCatalogOptions(),
    loadTemplateOptions(),
  ]);
  if (!deal) notFound();
  const contacts = await loadQuoteContacts(deal);

  const draft = {
    title: "",
    notes: settings.defaultQuoteTerms,
    items: [],
    billTo: billToDefaults(deal.contact, deal.company),
    contactId: deal.contactId,
    validUntil: toDateInput(addDays(orgToday(settings.utcOffsetMinutes), settings.quoteValidityDays)),
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Deals", href: "/system/deals" },
          { label: deal.title, href: `/system/deals/${deal.id}` },
          { label: "New quote" },
        ]}
        title="New quote"
        description={`For ${deal.title}`}
      />
      <Card>
        <CardBody>
          <LineItemsForm
            action={createQuote.bind(null, dealId)}
            mode="quote"
            draft={draft}
            catalog={catalog}
            templates={templates}
            contacts={contacts}
            currency={settings.currency}
            taxLabel={settings.taxLabel}
            taxRate={settings.taxRate}
            submitLabel="Save draft"
          />
        </CardBody>
      </Card>
    </div>
  );
}

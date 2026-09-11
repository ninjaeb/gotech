import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { createDealInvoice } from "@/app/actions/invoices";
import { LineItemsForm } from "@/components/documents/line-items-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { getBillingSettings } from "@/lib/settings";
import { requireSales } from "@/lib/auth/dal";
import { loadCatalogOptions, loadQuoteContacts } from "@/lib/documents/catalog";
import { addDays, orgToday, toDateInput } from "@/lib/documents/dates";
import { billToDefaults } from "@/lib/documents/snapshots";

export default async function NewInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireSales();
  const { id: dealId } = await params;

  const [settings, deal, catalog] = await Promise.all([
    getBillingSettings(),
    db.deal.findUnique({
      where: { id: dealId },
      select: { id: true, title: true, contactId: true, companyId: true, contact: true, company: true },
    }),
    loadCatalogOptions(),
  ]);
  if (!deal) notFound();
  const contacts = await loadQuoteContacts(deal);

  const draft = {
    title: "",
    notes: settings.defaultInvoiceNotes,
    items: [],
    billTo: billToDefaults(deal.contact, deal.company),
    contactId: deal.contactId,
    validUntil: toDateInput(addDays(orgToday(settings.utcOffsetMinutes), deal.company?.invoiceDueDays ?? settings.invoiceDueDays)),
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Deals", href: "/system/deals" },
          { label: deal.title, href: `/system/deals/${deal.id}` },
          { label: "New invoice" },
        ]}
        title="New invoice"
        description={`For ${deal.title}`}
      />
      <Card>
        <CardBody>
          <LineItemsForm
            action={createDealInvoice.bind(null, dealId)}
            mode="invoice"
            draft={draft}
            catalog={catalog}
            contacts={contacts}
            currency={settings.currency}
            taxLabel={settings.taxLabel}
            taxRate={settings.taxRate}
            submitLabel="Save draft"
            dateFieldName="dueDate"
            dateFieldLabel="Due date"
            documentNoun="invoice"
          />
        </CardBody>
      </Card>
    </div>
  );
}

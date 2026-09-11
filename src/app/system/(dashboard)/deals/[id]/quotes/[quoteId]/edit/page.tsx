import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { updateQuote } from "@/app/actions/quotes";
import { LineItemsForm } from "@/components/documents/line-items-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { getBillingSettings } from "@/lib/settings";
import { requireSales } from "@/lib/auth/dal";
import { loadCatalogOptions, loadQuoteContacts } from "@/lib/documents/catalog";
import { toDateInput } from "@/lib/documents/dates";
import { quoteNumberLabel, toLineItemsDraft } from "@/lib/documents/view-model";
import { withFlash } from "@/lib/utils";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string; quoteId: string }> }) {
  await requireSales();
  const { id: dealId, quoteId } = await params;

  const [settings, quote, catalog] = await Promise.all([
    getBillingSettings(),
    db.quote.findUnique({
      where: { id: quoteId, dealId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        deal: { select: { title: true, contactId: true, companyId: true } },
        revisionOf: { select: { number: true, revision: true } },
      },
    }),
    loadCatalogOptions(),
  ]);
  if (!quote) notFound();
  // Issued quotes are immutable — the detail page offers "Revise" instead.
  if (quote.status !== "DRAFT") {
    redirect(withFlash(`/system/deals/${dealId}/quotes/${quoteId}`, "Issued quotes can't be edited — create a revision instead."));
  }
  const contacts = await loadQuoteContacts(quote.deal);

  const draft = {
    title: quote.title,
    notes: quote.notes,
    items: toLineItemsDraft(quote.items),
    discountType: quote.discountType,
    discountValue: quote.discountValue.toString(),
    billTo: {
      billToName: quote.billToName ?? "",
      billToCompany: quote.billToCompany ?? "",
      billToRegistrationNo: quote.billToRegistrationNo ?? "",
      billToAddress: quote.billToAddress ?? "",
      billToEmail: quote.billToEmail ?? "",
    },
    contactId: quote.contactId,
    validUntil: toDateInput(quote.validUntil),
  };
  const label = quoteNumberLabel(quote, quote.revisionOf?.number ?? null);

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Deals", href: "/system/deals" },
          { label: quote.deal.title, href: `/system/deals/${dealId}` },
          { label: quote.title, href: `/system/deals/${dealId}/quotes/${quoteId}` },
          { label: "Edit" },
        ]}
        title="Edit quote"
        description={`${label} · ${quote.title}`}
      />
      <Card>
        <CardBody>
          <LineItemsForm
            action={updateQuote.bind(null, quote.id)}
            mode="quote"
            draft={draft}
            catalog={catalog}
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

import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { updateDealInvoice } from "@/app/actions/invoices";
import { LineItemsForm } from "@/components/documents/line-items-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { getBillingSettings } from "@/lib/settings";
import { requireSales } from "@/lib/auth/dal";
import { loadCatalogOptions, loadQuoteContacts } from "@/lib/documents/catalog";
import { toDateInput } from "@/lib/documents/dates";
import { invoiceNumberLabel, toLineItemsDraft } from "@/lib/documents/view-model";
import { withFlash } from "@/lib/utils";

export default async function EditDealInvoicePage({ params }: { params: Promise<{ id: string; invoiceId: string }> }) {
  await requireSales();
  const { id: dealId, invoiceId } = await params;

  const [settings, invoice, catalog] = await Promise.all([
    getBillingSettings(),
    db.invoice.findUnique({
      where: { id: invoiceId, dealId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        deal: { select: { title: true, contactId: true, companyId: true } },
      },
    }),
    loadCatalogOptions(),
  ]);
  if (!invoice || !invoice.deal) notFound();
  // Issued invoices are immutable — the detail page offers "Void" instead.
  if (invoice.status !== "DRAFT") {
    redirect(withFlash(`/system/deals/${dealId}/invoices/${invoiceId}`, "Issued invoices can't be edited — void it and issue a new one instead."));
  }
  const contacts = await loadQuoteContacts(invoice.deal);

  const draft = {
    title: invoice.title,
    notes: invoice.notes,
    items: toLineItemsDraft(invoice.items),
    discountType: invoice.discountType,
    discountValue: invoice.discountValue.toString(),
    billTo: {
      billToName: invoice.billToName ?? "",
      billToCompany: invoice.billToCompany ?? "",
      billToRegistrationNo: invoice.billToRegistrationNo ?? "",
      billToAddress: invoice.billToAddress ?? "",
      billToEmail: invoice.billToEmail ?? "",
    },
    contactId: invoice.contactId,
    validUntil: toDateInput(invoice.dueDate),
  };
  const label = invoiceNumberLabel(invoice);

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Deals", href: "/system/deals" },
          { label: invoice.deal.title, href: `/system/deals/${dealId}` },
          { label: invoice.title, href: `/system/deals/${dealId}/invoices/${invoiceId}` },
          { label: "Edit" },
        ]}
        title="Edit invoice"
        description={`${label} · ${invoice.title}`}
      />
      <Card>
        <CardBody>
          <LineItemsForm
            action={updateDealInvoice.bind(null, invoice.id)}
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

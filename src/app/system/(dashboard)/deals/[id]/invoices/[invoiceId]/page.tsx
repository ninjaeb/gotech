import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Mail, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteDealInvoice, issueInvoiceForm } from "@/app/actions/invoices";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { InvoiceSheet } from "@/components/documents/invoice-sheet";
import { DocumentEventsCard } from "@/components/documents/document-events-card";
import { PrintButton } from "@/components/documents/print-button";
import { IssueInvoiceButton } from "@/components/invoices/issue-invoice-button";
import { MarkInvoicePaidForm } from "@/components/invoices/mark-invoice-paid-form";
import { VoidInvoiceForm } from "@/components/invoices/void-invoice-form";
import { INVOICE_DERIVED_BADGE_CLASSES, INVOICE_DERIVED_LABELS, INVOICE_STATUS_BADGE_CLASSES, INVOICE_STATUS_LABELS } from "@/lib/labels";
import { formatDateTime, formatDocumentMoney, whatsAppUrl } from "@/lib/format";
import { getBillingSettings } from "@/lib/settings";
import { getSiteOrigin } from "@/lib/site-url";
import { requireSales } from "@/lib/auth/dal";
import { loadBusinessLogoUrl } from "@/lib/documents/catalog";
import { buildInvoiceViewModel, INVOICE_SHEET_INCLUDE } from "@/lib/documents/view-model";
import { sumMoney } from "@/lib/documents/money";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string; invoiceId: string }> }) {
  await requireSales();
  const { id: dealId, invoiceId } = await params;

  const [settings, origin, logoUrl, row, events] = await Promise.all([
    getBillingSettings(),
    getSiteOrigin(),
    loadBusinessLogoUrl(),
    db.invoice.findUnique({
      where: { id: invoiceId, dealId },
      include: INVOICE_SHEET_INCLUDE,
    }),
    db.documentEvent.findMany({
      where: { invoiceId },
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { name: true } } },
    }),
  ]);
  if (!row || !row.deal) notFound();

  const invoice = buildInvoiceViewModel(row, settings);
  const sourceQuote = row.fromQuoteId ? await db.quote.findUnique({ where: { id: row.fromQuoteId }, select: { id: true, number: true } }) : null;
  const publicUrl = `${origin}/i/${invoice.shareKey}`;
  const contactFirstName = row.contact?.firstName;
  const shareMessage = `Hi${contactFirstName ? ` ${contactFirstName}` : ""}, here's your invoice ${invoice.number ?? ""} "${invoice.title}": ${publicUrl}`;
  const whatsappHref = row.contact?.phone
    ? `${whatsAppUrl(row.contact.phone)}?text=${encodeURIComponent(shareMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const mailHref = `mailto:${invoice.billTo.email || row.contact?.email || ""}?subject=${encodeURIComponent(`Invoice ${invoice.number ?? ""}: ${invoice.title}`)}&body=${encodeURIComponent(shareMessage)}`;

  const isIssued = !invoice.isDraft;
  const canVoid = isIssued && invoice.status !== "PAID_IN_FULL" && invoice.status !== "VOID";
  const canMarkPaid = invoice.isOpen;
  const cost = sumMoney(row.items.map((item) => (item.unitCost ? Number(item.unitCost) * Number(item.quantity) : 0)));
  const hasCost = row.items.some((item) => item.unitCost !== null);
  const margin = hasCost ? Number(invoice.subtotal) - Number(invoice.discountAmount) - cost : null;

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Deals", href: "/system/deals" },
          { label: row.deal.title, href: `/system/deals/${dealId}` },
          { label: invoice.numberLabel },
        ]}
        title={invoice.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">{invoice.numberLabel}</span>
            {invoice.derived ? (
              <Badge className={INVOICE_DERIVED_BADGE_CLASSES[invoice.derived]}>{INVOICE_DERIVED_LABELS[invoice.derived]}</Badge>
            ) : (
              <Badge className={INVOICE_STATUS_BADGE_CLASSES[invoice.status]}>{INVOICE_STATUS_LABELS[invoice.status]}</Badge>
            )}
            <Link href={`/system/deals/${dealId}`} className="text-indigo-600 hover:underline">
              {row.deal.title}
            </Link>
            {sourceQuote && (
              <Link href={`/system/deals/${dealId}/quotes/${sourceQuote.id}`} className="text-slate-400 hover:underline">
                from {sourceQuote.number ?? "quote"}
              </Link>
            )}
          </span>
        }
        actions={
          invoice.isDraft ? (
            <>
              <Link href={`/system/deals/${dealId}/invoices/${invoice.id}/edit`} className={buttonClasses("secondary")}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
              <IssueInvoiceButton action={issueInvoiceForm.bind(null, invoice.id)} />
              <form action={deleteDealInvoice.bind(null, invoice.id)}>
                <ConfirmSubmitButton confirmMessage="Delete this draft? This can't be undone." size="md">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </ConfirmSubmitButton>
              </form>
            </>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <InvoiceSheet invoice={invoice} logoUrl={logoUrl} />
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Share</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {invoice.isDraft ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Issue the invoice to get its number and a link to send the client.</p>
              ) : (
                <>
                  <p className="break-all rounded-md bg-slate-50 px-2.5 py-2 text-xs text-slate-500 dark:bg-neutral-900 dark:text-slate-400">{publicUrl}</p>
                  <div className="flex flex-wrap gap-2">
                    <CopyLinkButton text={publicUrl} />
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "sm")}>
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                    <a href={mailHref} className={buttonClasses("secondary", "sm")}>
                      <Mail className="h-4 w-4" />
                      Email
                    </a>
                    <a href={`/i/${invoice.shareKey}`} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "sm")}>
                      <ExternalLink className="h-4 w-4" />
                      Preview
                    </a>
                    <PrintButton />
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {canMarkPaid && (
            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardBody>
                <MarkInvoicePaidForm invoiceId={invoice.id} />
              </CardBody>
            </Card>
          )}

          {canVoid && (
            <Card>
              <CardHeader>
                <CardTitle>Void</CardTitle>
              </CardHeader>
              <CardBody>
                <VoidInvoiceForm invoiceId={invoice.id} />
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="space-y-2.5 text-sm">
                <Stat label="Issued" value={formatDateTime(invoice.issuedAt)} />
                <Stat label="First viewed" value={formatDateTime(row.firstViewedAt)} />
                <Stat label="Last viewed" value={formatDateTime(row.lastViewedAt)} />
                <Stat label="Views" value={row.viewCount.toString()} />
                {invoice.paidAt && <Stat label="Paid" value={formatDateTime(invoice.paidAt)} />}
                {margin !== null && (
                  <Stat
                    label="Margin (staff only)"
                    value={`${formatDocumentMoney(margin, invoice.currency)}${Number(invoice.subtotal) > 0 ? ` · ${Math.round((margin / (Number(invoice.subtotal) - Number(invoice.discountAmount) || 1)) * 100)}%` : ""}`}
                  />
                )}
              </dl>
            </CardBody>
          </Card>

          <DocumentEventsCard events={events} currency={invoice.currency} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}

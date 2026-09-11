import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { RecordInvoiceView } from "@/components/invoices/record-invoice-view";
import { InvoiceSheet } from "@/components/documents/invoice-sheet";
import { PrintButton } from "@/components/documents/print-button";
import { formatDocumentDate } from "@/lib/format";
import { getBillingSettings } from "@/lib/settings";
import { loadBusinessLogoUrl } from "@/lib/documents/catalog";
import { buildInvoiceViewModel, INVOICE_SHEET_INCLUDE } from "@/lib/documents/view-model";

// The client's view of an invoice, reached by the share token minted at
// issue. Drafts (and invoices with no dealId — the old milestone shape)
// are never reachable here.
export default async function PublicInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: key } = await params;

  const [settings, logoUrl, row] = await Promise.all([
    getBillingSettings(),
    loadBusinessLogoUrl(),
    db.invoice.findFirst({
      where: { OR: [{ shareToken: key }, { id: key, shareToken: null }], status: { not: "DRAFT" }, dealId: { not: null } },
      include: INVOICE_SHEET_INCLUDE,
    }),
  ]);
  if (!row) notFound();

  const invoice = buildInvoiceViewModel(row, settings);
  const brand = invoice.issuer.name || "Gotka";

  return (
    <div className="min-h-full bg-slate-50 px-4 py-8 print:bg-white print:p-0 dark:bg-neutral-950">
      <RecordInvoiceView shareKey={key} />
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- our own blob route
              <img src={logoUrl} alt="" className="h-8 w-auto" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- static app icon
              <img src="/icon-192.png" alt="" className="h-8 w-8 shrink-0" />
            )}
            <span className="text-base font-semibold text-slate-900 dark:text-slate-100">{brand}</span>
          </div>
          <PrintButton />
        </div>

        <InvoiceSheet invoice={invoice} logoUrl={logoUrl} />

        <div className="rounded-lg border border-slate-200 bg-white p-5 print:hidden dark:border-neutral-800 dark:bg-neutral-950">
          {invoice.status === "PAID_IN_FULL" ? (
            <p className="rounded-md bg-emerald-50 px-3 py-2.5 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              Paid in full{invoice.paidAt ? ` on ${formatDocumentDate(invoice.paidAt)}` : ""}. Thank you!
            </p>
          ) : invoice.status === "VOID" ? (
            <p className="rounded-md bg-slate-100 px-3 py-2.5 text-center text-sm font-medium text-slate-600 dark:bg-neutral-800 dark:text-slate-300">
              This invoice has been voided. Contact us if you&apos;d like an updated one.
            </p>
          ) : invoice.derived === "overdue" ? (
            <p className="rounded-md bg-orange-50 px-3 py-2.5 text-center text-sm font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
              This invoice was due on {formatDocumentDate(invoice.dueDate)}. Please arrange payment as soon as possible.
            </p>
          ) : (
            <>
              {invoice.dueDate && (
                <p className="text-center text-sm text-slate-600 dark:text-slate-400">Payment due by {formatDocumentDate(invoice.dueDate)}.</p>
              )}
              {invoice.paymentInstructions && (
                <p className="mt-2 whitespace-pre-wrap text-center text-xs text-slate-500 dark:text-slate-400">{invoice.paymentInstructions}</p>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 print:hidden">Questions? Reply to whoever sent you this link.</p>
      </div>
    </div>
  );
}

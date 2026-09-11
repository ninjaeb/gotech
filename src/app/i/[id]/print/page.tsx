import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { InvoiceSheet } from "@/components/documents/invoice-sheet";
import { PrintButton } from "@/components/documents/print-button";
import { getBillingSettings } from "@/lib/settings";
import { loadBusinessLogoUrl } from "@/lib/documents/catalog";
import { buildInvoiceViewModel, INVOICE_SHEET_INCLUDE } from "@/lib/documents/view-model";

// Just the sheet, white background, no buttons — what "Save as PDF" prints.
export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="min-h-full bg-white px-6 py-8 print:p-0">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex justify-end print:hidden">
          <PrintButton />
        </div>
        <InvoiceSheet invoice={invoice} logoUrl={logoUrl} className="dark:bg-white dark:text-slate-800" />
      </div>
    </div>
  );
}

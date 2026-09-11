import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { RecordQuoteView } from "@/components/quotes/record-quote-view";
import { QuoteResponseButtons } from "@/components/quotes/quote-response-buttons";
import { DocumentSheet } from "@/components/documents/document-sheet";
import { PrintButton } from "@/components/documents/print-button";
import { formatDateTime, formatDocumentDate } from "@/lib/format";
import { getBillingSettings } from "@/lib/settings";
import { loadBusinessLogoUrl } from "@/lib/documents/catalog";
import { buildQuoteViewModel, QUOTE_SHEET_INCLUDE } from "@/lib/documents/view-model";

// The client's view of a quote, reached by the share token minted at issue
// (or, for quotes shared before tokens existed, the id). Drafts are never
// reachable here.
export default async function PublicQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: key } = await params;

  const [settings, logoUrl, row] = await Promise.all([
    getBillingSettings(),
    loadBusinessLogoUrl(),
    db.quote.findFirst({
      where: { OR: [{ shareToken: key }, { id: key, shareToken: null }], status: { not: "DRAFT" } },
      include: QUOTE_SHEET_INCLUDE,
    }),
  ]);
  if (!row) notFound();

  const quote = buildQuoteViewModel(row, settings);
  const brand = quote.issuer.name || "Gotka";

  return (
    <div className="min-h-full bg-slate-50 px-4 py-8 print:bg-white print:p-0 dark:bg-neutral-950">
      <RecordQuoteView shareKey={key} />
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

        <DocumentSheet quote={quote} logoUrl={logoUrl} />

        <div className="rounded-lg border border-slate-200 bg-white p-5 print:hidden dark:border-neutral-800 dark:bg-neutral-950">
          {quote.status === "ACCEPTED" ? (
            <p className="rounded-md bg-emerald-50 px-3 py-2.5 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              {quote.acceptedByName ? `${quote.acceptedByName} accepted` : "You accepted"} this quote on {formatDateTime(quote.respondedAt)}. Thank you!
            </p>
          ) : quote.status === "DECLINED" ? (
            <p className="rounded-md bg-slate-100 px-3 py-2.5 text-center text-sm font-medium text-slate-600 dark:bg-neutral-800 dark:text-slate-300">
              This quote was declined on {formatDateTime(quote.respondedAt)}.
            </p>
          ) : quote.derived === "superseded" && quote.supersededBy ? (
            <p className="rounded-md bg-amber-50 px-3 py-2.5 text-center text-sm font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              This quote has been replaced by a newer revision.{" "}
              <Link href={`/q/${quote.supersededBy.shareKey}`} className="underline">
                View revision {quote.supersededBy.revision}
              </Link>
            </p>
          ) : quote.derived === "withdrawn" ? (
            <p className="rounded-md bg-slate-100 px-3 py-2.5 text-center text-sm font-medium text-slate-600 dark:bg-neutral-800 dark:text-slate-300">
              This quote has been withdrawn. Contact us if you&apos;d like an updated one.
            </p>
          ) : quote.derived === "expired" ? (
            <p className="rounded-md bg-orange-50 px-3 py-2.5 text-center text-sm font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
              This quote expired on {formatDocumentDate(quote.validUntil)}. Contact us if you&apos;d still like to go ahead.
            </p>
          ) : (
            <>
              {quote.validUntil && (
                <p className="mb-3 text-center text-xs text-slate-500 dark:text-slate-400">
                  This quote is valid until {formatDocumentDate(quote.validUntil)}.
                </p>
              )}
              <QuoteResponseButtons shareKey={key} hasTerms={Boolean(quote.notes)} />
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 print:hidden">Questions? Reply to whoever sent you this link.</p>
      </div>
    </div>
  );
}

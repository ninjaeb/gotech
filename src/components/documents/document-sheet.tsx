import type { QuoteViewModel } from "@/lib/documents/view-model";
import { formatDocumentDate, formatDocumentMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

// The client-facing rendering of a quote — used by the public /q page, its
// print view and the staff detail page alike, so what staff see is exactly
// what the client gets. No hooks: it renders on the server.
export function DocumentSheet({
  quote,
  logoUrl,
  kind = "Quotation",
  className,
}: {
  quote: QuoteViewModel;
  logoUrl: string | null;
  kind?: string;
  className?: string;
}) {
  const money = (value: string) => formatDocumentMoney(value, quote.currency);
  const showDiscount = quote.discountType !== "NONE" && Number(quote.discountAmount) > 0;
  const showTax = Number(quote.taxRate) > 0;
  const stampLabel = quote.isDraft
    ? "DRAFT"
    : quote.derived === "superseded"
      ? "SUPERSEDED"
      : quote.derived === "withdrawn"
        ? "WITHDRAWN"
        : quote.derived === "expired"
          ? "EXPIRED"
          : quote.status === "ACCEPTED"
            ? "ACCEPTED"
            : quote.status === "DECLINED"
              ? "DECLINED"
              : null;

  return (
    <article
      className={cn(
        "relative rounded-lg border border-slate-200 bg-white p-6 text-slate-800 shadow-sm sm:p-10 print:border-0 print:p-0 print:shadow-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-slate-200 print:dark:bg-white print:dark:text-slate-800",
        className,
      )}
    >
      {stampLabel && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-6 top-6 rotate-6 rounded border-2 px-2 py-0.5 text-xs font-bold tracking-widest sm:right-10 sm:top-10",
            stampLabel === "ACCEPTED"
              ? "border-emerald-500 text-emerald-600"
              : stampLabel === "DRAFT"
                ? "border-slate-400 text-slate-400"
                : "border-rose-400 text-rose-500",
          )}
        >
          {stampLabel}
        </span>
      )}

      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- served from our own blob route, no optimisation wanted
            <img src={logoUrl} alt="" className="h-14 w-auto max-w-[9rem] object-contain" />
          )}
          <div className="text-sm">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{quote.issuer.name || "—"}</p>
            {quote.issuer.registrationNo && <p className="text-slate-500">Reg. no. {quote.issuer.registrationNo}</p>}
            {quote.issuer.taxNo && <p className="text-slate-500">{quote.taxLabel} no. {quote.issuer.taxNo}</p>}
            {quote.issuer.address && <p className="mt-1 whitespace-pre-line text-slate-600 dark:text-slate-400">{quote.issuer.address}</p>}
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              {[quote.issuer.phone, quote.issuer.email, quote.issuer.website].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="text-sm sm:text-right">
          <p className="text-2xl font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">{kind}</p>
          <p className="mt-1 font-medium text-slate-700 dark:text-slate-300">{quote.numberLabel}</p>
          <dl className="mt-2 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-slate-500 sm:justify-end">
            <dt>Date</dt>
            <dd className="text-slate-700 dark:text-slate-300">{formatDocumentDate(quote.issuedAt ?? new Date())}</dd>
            {quote.validUntil && (
              <>
                <dt>Valid until</dt>
                <dd className="text-slate-700 dark:text-slate-300">{formatDocumentDate(quote.validUntil)}</dd>
              </>
            )}
          </dl>
        </div>
      </header>

      <section className="mt-8 grid gap-6 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prepared for</p>
          <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{quote.billTo.company || quote.billTo.name || "—"}</p>
          {quote.billTo.company && quote.billTo.name && <p className="text-slate-600 dark:text-slate-400">Attn: {quote.billTo.name}</p>}
          {quote.billTo.registrationNo && <p className="text-slate-500">Reg. no. {quote.billTo.registrationNo}</p>}
          {quote.billTo.address && <p className="mt-1 whitespace-pre-line text-slate-600 dark:text-slate-400">{quote.billTo.address}</p>}
          {quote.billTo.email && <p className="text-slate-600 dark:text-slate-400">{quote.billTo.email}</p>}
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Subject</p>
          <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{quote.title}</p>
        </div>
      </section>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-300">
              <th className="hidden py-2 pr-3 font-semibold sm:table-cell">#</th>
              <th className="py-2 pr-3 font-semibold">Description</th>
              <th className="py-2 pr-3 text-right font-semibold">Qty</th>
              <th className="hidden py-2 pr-3 text-right font-semibold sm:table-cell">Unit price</th>
              {showTax && <th className="py-2 pr-3 text-right font-semibold">{quote.taxLabel}</th>}
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
            {quote.items.map((item, index) => (
              <tr key={item.id} className="align-top">
                <td className="hidden py-2.5 pr-3 text-slate-400 sm:table-cell">{index + 1}</td>
                <td className="py-2.5 pr-3 whitespace-pre-line text-slate-800 dark:text-slate-200">
                  {item.description}
                  {/* Unit price has no column of its own on narrow screens. */}
                  <span className="mt-0.5 block text-xs text-slate-400 sm:hidden">@ {money(item.unitPrice)}</span>
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                  {trimQty(item.quantity)}
                  {item.unit ? ` ${item.unit}` : ""}
                </td>
                <td className="hidden py-2.5 pr-3 text-right tabular-nums text-slate-600 sm:table-cell dark:text-slate-400">{money(item.unitPrice)}</td>
                {showTax && <td className="py-2.5 pr-3 text-right text-slate-500">{item.taxable ? "Yes" : "—"}</td>}
                <td className="py-2.5 text-right tabular-nums font-medium text-slate-800 dark:text-slate-200">{money(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <dl className="w-full max-w-xs space-y-1 text-sm">
          {(showDiscount || showTax) && (
            <div className="flex justify-between text-slate-500">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{money(quote.subtotal)}</dd>
            </div>
          )}
          {showDiscount && (
            <div className="flex justify-between text-slate-500">
              <dt>Discount{quote.discountType === "PERCENT" ? ` (${trimQty(quote.discountValue)}%)` : ""}</dt>
              <dd className="tabular-nums">− {money(quote.discountAmount)}</dd>
            </div>
          )}
          {showTax && (
            <div className="flex justify-between text-slate-500">
              <dt>
                {quote.taxLabel} {trimQty(quote.taxRate)}%
              </dt>
              <dd className="tabular-nums">{money(quote.taxAmount)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t-2 border-slate-800 pt-2 dark:border-slate-300">
            <dt className="font-semibold text-slate-900 dark:text-slate-100">Total ({quote.currency})</dt>
            <dd className="text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{money(quote.total)}</dd>
          </div>
        </dl>
      </div>

      {quote.notes && (
        <section className="mt-8 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Terms &amp; notes</p>
          <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{quote.notes}</p>
        </section>
      )}

      {quote.status === "ACCEPTED" && quote.respondedAt && (
        <section className="mt-8 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 print:bg-white dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Accepted{quote.acceptedByName ? ` by ${quote.acceptedByName}` : ""} on {formatDocumentDate(quote.respondedAt)}
          {quote.acceptedReference ? ` · Ref. ${quote.acceptedReference}` : ""}
        </section>
      )}
    </article>
  );
}

// "2.00" → "2", "2.50" → "2.5" — quantities and percents read better without
// trailing zeros; money keeps its two decimals.
function trimQty(value: string) {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}

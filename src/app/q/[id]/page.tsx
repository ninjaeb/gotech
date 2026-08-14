import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { RecordQuoteView } from "@/components/quotes/record-quote-view";
import { QuoteResponseButtons } from "@/components/quotes/quote-response-buttons";
import { Card, CardBody } from "@/components/ui/card";
import { lineItemTotal, quoteTotal } from "@/lib/quotes";
import { formatCurrency, formatDateTime, fullName } from "@/lib/format";
import { getCurrency } from "@/lib/settings";

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [currency, quote] = await Promise.all([
    getCurrency(),
    db.quote.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        deal: { include: { company: true, contact: true } },
      },
    }),
  ]);

  if (!quote) notFound();

  const total = quoteTotal(quote.items);
  const preparedFor =
    quote.deal.company?.name ??
    (quote.deal.contact ? fullName(quote.deal.contact.firstName, quote.deal.contact.lastName) : null);
  const isResolved = quote.status === "ACCEPTED" || quote.status === "DECLINED";

  return (
    <div className="min-h-full bg-slate-50 px-4 py-12 dark:bg-neutral-950">
      <RecordQuoteView quoteId={quote.id} />
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
            G
          </div>
          <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">GoTech</span>
        </div>

        <Card>
          <CardBody className="space-y-6">
            <div>
              {preparedFor && (
                <p className="text-sm text-slate-500 dark:text-slate-400">Prepared for {preparedFor}</p>
              )}
              <h1 className="mt-0.5 text-xl font-semibold text-slate-900 dark:text-slate-100">
                {quote.title}
              </h1>
            </div>

            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {quote.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-slate-800 dark:text-slate-200">{item.description}</p>
                    <p className="text-xs text-slate-400">
                      {item.quantity.toString()} × {formatCurrency(item.unitPrice.toString(), currency)}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium text-slate-700 dark:text-slate-300">
                    {formatCurrency(lineItemTotal(item), currency)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-neutral-800">
              <span className="font-medium text-slate-500 dark:text-slate-400">Total</span>
              <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(total, currency)}
              </span>
            </div>

            {quote.notes && (
              <div className="rounded-md bg-slate-50 p-3 text-sm dark:bg-neutral-900">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{quote.notes}</p>
              </div>
            )}

            <div className="border-t border-slate-200 pt-5 dark:border-neutral-800">
              {quote.status === "ACCEPTED" ? (
                <p className="rounded-md bg-emerald-50 px-3 py-2.5 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  You accepted this quote on {formatDateTime(quote.respondedAt)}.
                </p>
              ) : quote.status === "DECLINED" ? (
                <p className="rounded-md bg-slate-100 px-3 py-2.5 text-center text-sm font-medium text-slate-600 dark:bg-neutral-800 dark:text-slate-300">
                  You declined this quote on {formatDateTime(quote.respondedAt)}.
                </p>
              ) : (
                <QuoteResponseButtons quoteId={quote.id} />
              )}
            </div>
          </CardBody>
        </Card>

        {!isResolved && (
          <p className="mt-4 text-center text-xs text-slate-400">
            Questions? Reply to whoever sent you this link.
          </p>
        )}
      </div>
    </div>
  );
}

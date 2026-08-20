import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MessageCircle, Pencil, Send, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteQuote, sendQuote } from "@/app/actions/quotes";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { QUOTE_STATUS_BADGE_CLASSES, QUOTE_STATUS_LABELS } from "@/lib/labels";
import { lineItemTotal, quoteTotal } from "@/lib/quotes";
import { formatCurrency, formatDateTime, whatsAppUrl } from "@/lib/format";
import { getCurrency } from "@/lib/settings";
import { getSiteOrigin } from "@/lib/site-url";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string; quoteId: string }>;
}) {
  const { id: dealId, quoteId } = await params;

  const [currency, origin, quote] = await Promise.all([
    getCurrency(),
    getSiteOrigin(),
    db.quote.findUnique({
      where: { id: quoteId, dealId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        deal: { include: { company: true, contact: true } },
      },
    }),
  ]);

  if (!quote) notFound();

  const total = quoteTotal(quote.items);
  const publicUrl = `${origin}/q/${quote.id}`;
  const shareMessage = `Hi${quote.deal.contact ? ` ${quote.deal.contact.firstName}` : ""}, here's your quote "${quote.title}": ${publicUrl}`;
  const whatsappHref = quote.deal.contact?.phone
    ? `${whatsAppUrl(quote.deal.contact.phone)}?text=${encodeURIComponent(shareMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const mailHref = `mailto:${quote.deal.contact?.email ?? ""}?subject=${encodeURIComponent(`Quote: ${quote.title}`)}&body=${encodeURIComponent(shareMessage)}`;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={quote.title}
        description={
          <Link href={`/deals/${dealId}`} className="text-indigo-600 hover:underline">
            {quote.deal.title}
          </Link>
        }
        actions={
          <>
            <Link href={`/deals/${dealId}/quotes/${quote.id}/edit`} className={buttonClasses("secondary")}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <form action={deleteQuote.bind(null, quote.id)}>
              <ConfirmSubmitButton confirmMessage="Delete this quote? This can't be undone.">
                <Trash2 className="h-4 w-4" />
                Delete
              </ConfirmSubmitButton>
            </form>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Line items</CardTitle>
              <Badge className={QUOTE_STATUS_BADGE_CLASSES[quote.status]}>
                {QUOTE_STATUS_LABELS[quote.status]}
              </Badge>
            </CardHeader>
            <CardBody>
              <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
                {quote.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-slate-800 dark:text-slate-200">{item.description}</p>
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
              <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 text-sm dark:border-neutral-800">
                <span className="font-medium text-slate-500 dark:text-slate-400">Total</span>
                <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(total, currency)}
                </span>
              </div>
              {quote.notes && (
                <div className="mt-4 text-sm">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{quote.notes}</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Share</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {quote.status === "DRAFT" && (
                <form action={sendQuote.bind(null, quote.id)}>
                  <Button type="submit" className="w-full">
                    <Send className="h-4 w-4" />
                    Mark as sent
                  </Button>
                </form>
              )}
              <p className="break-all rounded-md bg-slate-50 px-2.5 py-2 text-xs text-slate-500 dark:bg-neutral-900 dark:text-slate-400">
                {publicUrl}
              </p>
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
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="space-y-2.5 text-sm">
                <Stat label="Sent" value={formatDateTime(quote.sentAt)} />
                <Stat label="First viewed" value={formatDateTime(quote.firstViewedAt)} />
                <Stat label="Last viewed" value={formatDateTime(quote.lastViewedAt)} />
                <Stat label="Views" value={quote.viewCount.toString()} />
                {quote.respondedAt && <Stat label="Responded" value={formatDateTime(quote.respondedAt)} />}
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}

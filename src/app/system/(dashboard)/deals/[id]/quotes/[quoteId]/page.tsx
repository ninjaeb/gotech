import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy, ExternalLink, FilePlus2, Mail, MessageCircle, Pencil, Receipt, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteQuote, duplicateQuote, issueQuoteForm, reviseQuote } from "@/app/actions/quotes";
import { convertQuoteToInvoice } from "@/app/actions/invoices";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { DocumentSheet } from "@/components/documents/document-sheet";
import { DocumentEventsCard } from "@/components/documents/document-events-card";
import { PrintButton } from "@/components/documents/print-button";
import { IssueQuoteButton } from "@/components/quotes/issue-quote-button";
import { RecordResponseForm } from "@/components/quotes/record-response-form";
import { WithdrawQuoteForm } from "@/components/quotes/withdraw-quote-form";
import { ExtendValidityForm } from "@/components/quotes/extend-validity-form";
import { QUOTE_DERIVED_BADGE_CLASSES, QUOTE_DERIVED_LABELS, QUOTE_STATUS_BADGE_CLASSES, QUOTE_STATUS_LABELS } from "@/lib/labels";
import { formatDateTime, formatDocumentMoney, whatsAppUrl } from "@/lib/format";
import { getBillingSettings } from "@/lib/settings";
import { getSiteOrigin } from "@/lib/site-url";
import { requireSales } from "@/lib/auth/dal";
import { loadBusinessLogoUrl } from "@/lib/documents/catalog";
import { toDateInput } from "@/lib/documents/dates";
import { buildQuoteViewModel, QUOTE_SHEET_INCLUDE } from "@/lib/documents/view-model";
import { sumMoney } from "@/lib/documents/money";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string; quoteId: string }> }) {
  await requireSales();
  const { id: dealId, quoteId } = await params;

  const [settings, origin, logoUrl, row, events] = await Promise.all([
    getBillingSettings(),
    getSiteOrigin(),
    loadBusinessLogoUrl(),
    db.quote.findUnique({
      where: { id: quoteId, dealId },
      include: { ...QUOTE_SHEET_INCLUDE, revisions: { select: { id: true, revision: true, status: true }, orderBy: { revision: "asc" } } },
    }),
    db.documentEvent.findMany({
      where: { quoteId },
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { name: true } } },
    }),
  ]);
  if (!row) notFound();

  const quote = buildQuoteViewModel(row, settings);
  const publicUrl = `${origin}/q/${quote.shareKey}`;
  const contactFirstName = row.contact?.firstName;
  const shareMessage = `Hi${contactFirstName ? ` ${contactFirstName}` : ""}, here's your quote ${quote.number ?? ""} "${quote.title}": ${publicUrl}`;
  const whatsappHref = row.contact?.phone
    ? `${whatsAppUrl(row.contact.phone)}?text=${encodeURIComponent(shareMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const mailHref = `mailto:${quote.billTo.email || row.contact?.email || ""}?subject=${encodeURIComponent(`Quote ${quote.number ?? ""}: ${quote.title}`)}&body=${encodeURIComponent(shareMessage)}`;

  const isIssued = !quote.isDraft;
  const canWithdraw = isIssued && quote.status !== "ACCEPTED" && quote.derived !== "withdrawn" && quote.derived !== "superseded";
  const hasDraftRevision = row.revisions.some((r) => r.status === "DRAFT");
  const cost = sumMoney(row.items.map((item) => (item.unitCost ? Number(item.unitCost) * Number(item.quantity) : 0)));
  const hasCost = row.items.some((item) => item.unitCost !== null);
  const margin = hasCost ? Number(quote.subtotal) - Number(quote.discountAmount) - cost : null;

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Deals", href: "/system/deals" },
          { label: row.deal.title, href: `/system/deals/${dealId}` },
          { label: quote.numberLabel },
        ]}
        title={quote.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">{quote.numberLabel}</span>
            {quote.derived ? (
              <Badge className={QUOTE_DERIVED_BADGE_CLASSES[quote.derived]}>{QUOTE_DERIVED_LABELS[quote.derived]}</Badge>
            ) : (
              <Badge className={QUOTE_STATUS_BADGE_CLASSES[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Badge>
            )}
            <Link href={`/system/deals/${dealId}`} className="text-indigo-600 hover:underline">
              {row.deal.title}
            </Link>
          </span>
        }
        actions={
          <>
            {quote.isDraft ? (
              <>
                <Link href={`/system/deals/${dealId}/quotes/${quote.id}/edit`} className={buttonClasses("secondary")}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
                <IssueQuoteButton action={issueQuoteForm.bind(null, quote.id)} />
                <form action={deleteQuote.bind(null, quote.id)}>
                  <ConfirmSubmitButton confirmMessage="Delete this draft? This can't be undone." size="md">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </>
            ) : (
              <>
                {!hasDraftRevision && quote.derived !== "superseded" && (
                  <form action={reviseQuote.bind(null, quote.id)}>
                    <button type="submit" className={buttonClasses("secondary")}>
                      <FilePlus2 className="h-4 w-4" />
                      Revise
                    </button>
                  </form>
                )}
                <form action={duplicateQuote.bind(null, quote.id)}>
                  <button type="submit" className={buttonClasses("secondary")}>
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </button>
                </form>
                {quote.status === "ACCEPTED" && (
                  <form action={convertQuoteToInvoice.bind(null, quote.id)}>
                    {row.convertedAt ? (
                      <ConfirmSubmitButton
                        variant="secondary"
                        size="md"
                        confirmMessage="An invoice was already drafted from this quote. Draft another one anyway?"
                      >
                        <Receipt className="h-4 w-4" />
                        Convert to invoice
                      </ConfirmSubmitButton>
                    ) : (
                      <button type="submit" className={buttonClasses("secondary")}>
                        <Receipt className="h-4 w-4" />
                        Convert to invoice
                      </button>
                    )}
                  </form>
                )}
              </>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <DocumentSheet quote={quote} logoUrl={logoUrl} />

          {(row.revisions.length > 0 || quote.revisionOf) && (
            <Card>
              <CardHeader>
                <CardTitle>Revisions</CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="space-y-1.5 text-sm">
                  {quote.revisionOf && (
                    <li>
                      <Link href={`/system/deals/${dealId}/quotes/${quote.revisionOf.id}`} className="text-indigo-600 hover:underline">
                        ← Revision {quote.revisionOf.revision} (previous)
                      </Link>
                    </li>
                  )}
                  {row.revisions.map((r) => (
                    <li key={r.id} className="flex items-center gap-2">
                      <Link href={`/system/deals/${dealId}/quotes/${r.id}`} className="text-indigo-600 hover:underline">
                        Revision {r.revision}
                      </Link>
                      <Badge className={QUOTE_STATUS_BADGE_CLASSES[r.status]}>{QUOTE_STATUS_LABELS[r.status]}</Badge>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Share</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {quote.isDraft ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Issue the quote to get its number and a link the client can accept from.
                </p>
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
                    <a href={`/q/${quote.shareKey}`} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "sm")}>
                      <ExternalLink className="h-4 w-4" />
                      Preview
                    </a>
                    <PrintButton />
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {quote.isOpen && (
            <Card>
              <CardHeader>
                <CardTitle>Record a response</CardTitle>
              </CardHeader>
              <CardBody>
                <RecordResponseForm quoteId={quote.id} />
              </CardBody>
            </Card>
          )}

          {isIssued && (quote.isOpen || quote.derived === "expired") && (
            <Card>
              <CardHeader>
                <CardTitle>{quote.derived === "expired" ? "Reopen" : "Validity"}</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                <ExtendValidityForm quoteId={quote.id} validUntil={toDateInput(quote.validUntil)} />
              </CardBody>
            </Card>
          )}

          {canWithdraw && (
            <Card>
              <CardHeader>
                <CardTitle>Withdraw</CardTitle>
              </CardHeader>
              <CardBody>
                <WithdrawQuoteForm quoteId={quote.id} />
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="space-y-2.5 text-sm">
                <Stat label="Issued" value={formatDateTime(quote.issuedAt)} />
                <Stat label="First viewed" value={formatDateTime(row.firstViewedAt)} />
                <Stat label="Last viewed" value={formatDateTime(row.lastViewedAt)} />
                <Stat label="Views" value={row.viewCount.toString()} />
                {quote.respondedAt && <Stat label="Responded" value={formatDateTime(quote.respondedAt)} />}
                {margin !== null && (
                  <Stat
                    label="Margin (staff only)"
                    value={`${formatDocumentMoney(margin, quote.currency)}${Number(quote.subtotal) > 0 ? ` · ${Math.round((margin / (Number(quote.subtotal) - Number(quote.discountAmount) || 1)) * 100)}%` : ""}`}
                  />
                )}
              </dl>
            </CardBody>
          </Card>

          <DocumentEventsCard events={events} currency={quote.currency} />
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

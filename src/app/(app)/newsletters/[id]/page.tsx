import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { cancelNewsletterSchedule, deleteNewsletter, updateNewsletter } from "@/app/actions/newsletters";
import { getNewsletterAudienceCount, formatScheduledAt } from "@/lib/newsletters";
import { renderNewsletterBodyHtml } from "@/lib/newsletter-render";
import { getBookingSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { NewsletterForm } from "@/components/newsletters/newsletter-form";
import { NewsletterScheduleForm } from "@/components/newsletters/newsletter-schedule-form";
import { NewsletterSendNowForm } from "@/components/newsletters/newsletter-send-now-form";
import { NewsletterStatusBadge } from "@/components/newsletters/newsletter-status-badge";

export default async function NewsletterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const newsletter = await db.newsletter.findUnique({
    where: { id },
    include: { list: { select: { id: true, name: true, type: true, filterDefinition: true } } },
  });
  if (!newsletter) notFound();

  const [lists, { utcOffsetMinutes }, recipientCounts] = await Promise.all([
    db.contactList.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getBookingSettings(),
    db.newsletterRecipient.groupBy({ by: ["status"], where: { newsletterId: id }, _count: true }),
  ]);
  const countByStatus = Object.fromEntries(recipientCounts.map((row) => [row.status, row._count]));
  const sentCount = countByStatus.SENT ?? 0;
  const failedCount = countByStatus.FAILED ?? 0;
  const pendingCount = countByStatus.PENDING ?? 0;
  const totalRecipients = sentCount + failedCount + pendingCount;

  const audiencePreview =
    newsletter.status === "DRAFT" && newsletter.list ? await getNewsletterAudienceCount(newsletter.list) : null;

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Newsletters", href: "/newsletters" }, { label: newsletter.subject }]}
        title={newsletter.subject}
        description={<NewsletterStatusBadge status={newsletter.status} />}
      />

      {newsletter.status === "DRAFT" ? (
        <div className="space-y-6">
          <Card>
            <CardBody>
              <NewsletterForm
                action={updateNewsletter.bind(null, id)}
                lists={lists}
                newsletter={{ subject: newsletter.subject, bodyMarkdown: newsletter.bodyMarkdown, listId: newsletter.listId }}
                submitLabel="Save changes"
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Send</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {newsletter.list
                  ? `${audiencePreview ?? 0} of the contacts in "${newsletter.list.name}" have an email and haven't unsubscribed.`
                  : "Choose an audience above before sending."}
              </p>

              <NewsletterScheduleForm newsletterId={id} />

              <div className="flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-neutral-800">
                <NewsletterSendNowForm newsletterId={id} subject={newsletter.subject} />
                <form action={deleteNewsletter.bind(null, id)} className="ml-auto">
                  <ConfirmSubmitButton confirmMessage={`Delete the "${newsletter.subject}" draft?`}>
                    Delete draft
                  </ConfirmSubmitButton>
                </form>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Message</CardTitle>
            </CardHeader>
            <CardBody>
              <div
                className={cn(
                  "text-sm leading-relaxed text-slate-800 dark:text-slate-200",
                  "[&_p]:mb-4 [&_a]:text-indigo-600 [&_a]:underline dark:[&_a]:text-indigo-400",
                  "[&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold",
                  "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold",
                  "[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:font-semibold",
                  "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5",
                  "[&_li]:my-1 [&_img]:max-w-full",
                  "[&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 dark:[&_blockquote]:border-neutral-700 dark:[&_blockquote]:text-slate-400",
                )}
                dangerouslySetInnerHTML={{ __html: renderNewsletterBodyHtml(newsletter.bodyMarkdown) }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-400">Audience</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-200">{newsletter.list?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Recipients</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-200">{totalRecipients}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Sent</dt>
                  <dd className="font-medium text-emerald-600 dark:text-emerald-400">{sentCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Failed</dt>
                  <dd className="font-medium text-rose-600 dark:text-rose-400">{failedCount}</dd>
                </div>
              </dl>

              {newsletter.status === "SCHEDULED" && newsletter.scheduledAt && (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Scheduled for {formatScheduledAt(newsletter.scheduledAt, utcOffsetMinutes)}.
                  </p>
                  <form action={cancelNewsletterSchedule.bind(null, id)}>
                    <ConfirmSubmitButton confirmMessage="Cancel this scheduled send and go back to draft?">
                      Cancel schedule
                    </ConfirmSubmitButton>
                  </form>
                </>
              )}
              {newsletter.status === "SENDING" && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Sending — {pendingCount} still to go. Refresh to see progress.
                </p>
              )}
              {newsletter.status === "SENT" && newsletter.sentAt && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Finished sending on {formatScheduledAt(newsletter.sentAt, utcOffsetMinutes)}.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

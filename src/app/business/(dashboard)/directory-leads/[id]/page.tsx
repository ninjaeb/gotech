import { notFound } from "next/navigation";
import { AlertTriangle, Mail, Phone } from "lucide-react";
import { requirePartner } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getCurrency } from "@/lib/settings";
import { formatDate, formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { DirectoryLeadStatusSelect } from "@/components/directory/directory-lead-status-select";
import { DirectoryLeadValueForm } from "@/components/directory/directory-lead-value-form";
import { DirectoryLeadReplyForm } from "@/components/directory/directory-lead-reply-form";

export default async function PartnerDirectoryLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePartner();
  const { id } = await params;
  const [currency, lead] = await Promise.all([
    getCurrency(),
    db.directoryLead.findFirst({
      where: { id, listing: { partnerId: user.id } },
      include: {
        replies: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
        listing: { select: { companyName: true } },
      },
    }),
  ]);
  if (!lead) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Directory leads", href: "/business/directory-leads" },
          { label: lead.listing.companyName },
          { label: lead.name },
        ]}
        title={lead.name}
        description={`Sent ${formatDateTime(lead.createdAt)}`}
        actions={<DirectoryLeadStatusSelect leadId={lead.id} status={lead.status} />}
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inquiry</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              {lead.company && <span>{lead.company}</span>}
              <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 hover:text-petrol dark:hover:text-petrol-light">
                <Mail className="h-3.5 w-3.5" />
                {lead.email}
              </a>
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 hover:text-petrol dark:hover:text-petrol-light">
                  <Phone className="h-3.5 w-3.5" />
                  {lead.phone}
                </a>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{lead.message}</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Value & notes</CardTitle>
          </CardHeader>
          <CardBody>
            <DirectoryLeadValueForm
              leadId={lead.id}
              value={lead.value !== null ? Number(lead.value) : null}
              notes={lead.notes}
              currency={currency}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reply</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {lead.replies.length > 0 && (
            <ul className="space-y-3">
              {lead.replies.map((reply) => (
                <li key={reply.id} className="rounded-md bg-slate-50 p-3 text-sm dark:bg-neutral-800">
                  <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">{reply.body}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                    {reply.author.name} · {formatDate(reply.createdAt)}
                    {!reply.sentAt && (
                      <span className="inline-flex items-center gap-1 text-rose-500 dark:text-rose-400" title={reply.sendError ?? undefined}>
                        <AlertTriangle className="h-3 w-3" />
                        Not delivered
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <DirectoryLeadReplyForm leadId={lead.id} />
        </CardBody>
      </Card>
    </div>
  );
}

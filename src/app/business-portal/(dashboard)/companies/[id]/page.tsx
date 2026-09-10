import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deletePartnerCompany } from "@/app/actions/partner-companies";
import { requireCompletePartnerProfile } from "@/lib/auth/dal";
import { getCurrency } from "@/lib/settings";
import { formatCurrency, formatDate, fullName } from "@/lib/format";
import { INDUSTRY_LABELS, PARTNER_DEAL_STATUS_BADGE_CLASSES, PARTNER_DEAL_STATUS_LABELS } from "@/lib/labels";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function PartnerCompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCompletePartnerProfile();
  const { id } = await params;
  const [currency, company] = await Promise.all([
    getCurrency(),
    db.partnerCompany.findFirst({
      where: { id, partnerId: user.id },
      include: {
        contacts: { orderBy: { firstName: "asc" } },
        deals: { orderBy: { createdAt: "desc" } },
        tasks: { where: { completed: false }, orderBy: { dueDate: "asc" } },
      },
    }),
  ]);
  if (!company) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Companies", href: "/business-portal/companies" }, { label: company.name }]}
        title={company.name}
        description={company.industry ? INDUSTRY_LABELS[company.industry] : undefined}
        actions={
          <>
            <Link href={`/business-portal/companies/${company.id}/edit`} className={buttonClasses("secondary")}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <form action={deletePartnerCompany.bind(null, company.id)}>
              <ConfirmSubmitButton confirmMessage="Delete this company? Its contacts, deals, and tasks will be unlinked.">
                <Trash2 className="h-4 w-4" />
                Delete
              </ConfirmSubmitButton>
            </form>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
          <DetailRow label="Website" value={company.website} />
          <DetailRow label="Phone" value={company.phone} />
          <DetailRow label="Address" value={company.address} />
          {company.notes && (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{company.notes}</p>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contacts ({company.contacts.length})</CardTitle>
            <Link href={`/business-portal/contacts/new?companyId=${company.id}`} className={buttonClasses("secondary", "sm")}>
              <Plus className="h-4 w-4" />
              Add contact
            </Link>
          </CardHeader>
          <CardBody>
            {company.contacts.length === 0 ? (
              <EmptyState title="No contacts linked to this company yet." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
                {company.contacts.map((contact) => (
                  <li key={contact.id}>
                    <Link
                      href={`/business-portal/contacts/${contact.id}`}
                      className="flex items-center justify-between py-2.5 text-sm hover:text-petrol dark:hover:text-petrol-light"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {fullName(contact.firstName, contact.lastName)}
                      </span>
                      <span className="text-slate-400">{contact.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deals ({company.deals.length})</CardTitle>
            <Link href={`/business-portal/deals/new?companyId=${company.id}`} className={buttonClasses("secondary", "sm")}>
              <Plus className="h-4 w-4" />
              Add deal
            </Link>
          </CardHeader>
          <CardBody>
            {company.deals.length === 0 ? (
              <EmptyState title="No deals linked to this company yet." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
                {company.deals.map((deal) => (
                  <li key={deal.id}>
                    <Link
                      href={`/business-portal/deals/${deal.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-petrol dark:hover:text-petrol-light"
                    >
                      <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-200">{deal.title}</span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="text-slate-500 dark:text-slate-400">{formatCurrency(deal.value.toString(), currency)}</span>
                        <Badge className={PARTNER_DEAL_STATUS_BADGE_CLASSES[deal.status]}>{PARTNER_DEAL_STATUS_LABELS[deal.status]}</Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open tasks ({company.tasks.length})</CardTitle>
          <Link href={`/business-portal/tasks/new?companyId=${company.id}`} className={buttonClasses("secondary", "sm")}>
            <Plus className="h-4 w-4" />
            Add task
          </Link>
        </CardHeader>
        <CardBody>
          {company.tasks.length === 0 ? (
            <EmptyState title="No open tasks for this company." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {company.tasks.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/business-portal/tasks/${task.id}`}
                    className="flex items-center justify-between py-2.5 text-sm hover:text-petrol dark:hover:text-petrol-light"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200">{task.title}</span>
                    {task.dueDate && <span className="text-slate-400">{formatDate(task.dueDate)}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-slate-800 dark:text-slate-200">{value || "—"}</p>
    </div>
  );
}

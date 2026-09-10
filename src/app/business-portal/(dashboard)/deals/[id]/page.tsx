import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deletePartnerDeal } from "@/app/actions/partner-deals";
import { requireCompletePartnerProfile } from "@/lib/auth/dal";
import { getCurrency } from "@/lib/settings";
import { formatCurrency, formatDate, fullName } from "@/lib/format";
import { PARTNER_DEAL_STATUS_BADGE_CLASSES, PARTNER_DEAL_STATUS_LABELS } from "@/lib/labels";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function PartnerDealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCompletePartnerProfile();
  const { id } = await params;
  const [currency, deal] = await Promise.all([
    getCurrency(),
    db.partnerDeal.findFirst({
      where: { id, partnerId: user.id },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        tasks: { where: { completed: false }, orderBy: { dueDate: "asc" } },
      },
    }),
  ]);
  if (!deal) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Deals", href: "/business-portal/deals" }, { label: deal.title }]}
        title={deal.title}
        description={<Badge className={PARTNER_DEAL_STATUS_BADGE_CLASSES[deal.status]}>{PARTNER_DEAL_STATUS_LABELS[deal.status]}</Badge>}
        actions={
          <>
            <Link href={`/business-portal/deals/${deal.id}/edit`} className={buttonClasses("secondary")}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <form action={deletePartnerDeal.bind(null, deal.id)}>
              <ConfirmSubmitButton confirmMessage="Delete this deal? Its tasks will be unlinked.">
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
          <DetailRow label="Value" value={formatCurrency(deal.value.toString(), currency)} />
          <DetailRow label="Expected close date" value={deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : null} />
          <DetailRow
            label="Company"
            value={deal.company && <Link href={`/business-portal/companies/${deal.company.id}`} className="hover:text-petrol dark:hover:text-petrol-light">{deal.company.name}</Link>}
          />
          <DetailRow
            label="Contact"
            value={deal.contact && <Link href={`/business-portal/contacts/${deal.contact.id}`} className="hover:text-petrol dark:hover:text-petrol-light">{fullName(deal.contact.firstName, deal.contact.lastName)}</Link>}
          />
          {deal.notes && (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{deal.notes}</p>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open tasks ({deal.tasks.length})</CardTitle>
          <Link href={`/business-portal/tasks/new?dealId=${deal.id}`} className={buttonClasses("secondary", "sm")}>
            <Plus className="h-4 w-4" />
            Add task
          </Link>
        </CardHeader>
        <CardBody>
          {deal.tasks.length === 0 ? (
            <EmptyState title="No open tasks for this deal." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {deal.tasks.map((task) => (
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

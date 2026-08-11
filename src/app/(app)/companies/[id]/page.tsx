import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteCompany } from "@/app/actions/companies";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { ActivityForm } from "@/components/activity/activity-form";
import { TaskList } from "@/components/tasks/task-list";
import { TaskQuickForm } from "@/components/tasks/task-quick-form";
import { AiInsightsPanel } from "@/components/ai/ai-insights-panel";
import { DEAL_STAGE_BADGE_CLASSES, DEAL_STAGE_LABELS } from "@/lib/labels";
import { formatCurrency } from "@/lib/format";
import { getCurrency } from "@/lib/settings";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [currency, company] = await Promise.all([
    getCurrency(),
    db.company.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: { firstName: "asc" } },
        deals: { orderBy: { createdAt: "desc" } },
        tasks: { orderBy: [{ completed: "asc" }, { dueDate: "asc" }] },
        activities: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    }),
  ]);

  if (!company) notFound();

  return (
    <div>
      <PageHeader
        title={company.name}
        description={[company.industry, company.domain].filter(Boolean).join(" · ")}
        actions={
          <>
            <Link
              href={`/companies/${company.id}/edit`}
              className={buttonClasses("secondary")}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <form action={deleteCompany.bind(null, company.id)}>
              <ConfirmSubmitButton confirmMessage="Delete this company? Contacts and deals will be unlinked.">
                <Trash2 className="h-4 w-4" />
                Delete
              </ConfirmSubmitButton>
            </form>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
              <DetailRow label="Domain" value={company.domain} />
              <DetailRow label="Industry" value={company.industry} />
              <DetailRow label="Phone" value={company.phone} />
              <DetailRow label="Address" value={company.address} />
              {company.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {company.notes}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contacts ({company.contacts.length})</CardTitle>
              <Link
                href={`/contacts/new?companyId=${company.id}`}
                className={buttonClasses("secondary", "sm")}
              >
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
                        href={`/contacts/${contact.id}`}
                        className="flex items-center justify-between py-2.5 text-sm hover:text-indigo-600"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {contact.firstName} {contact.lastName}
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
              <Link
                href={`/deals/new?companyId=${company.id}`}
                className={buttonClasses("secondary", "sm")}
              >
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
                        href={`/deals/${deal.id}`}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-indigo-600"
                      >
                        <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-200">
                          {deal.title}
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="text-slate-500 dark:text-slate-400">
                            {formatCurrency(deal.value.toString(), currency)}
                          </span>
                          <Badge className={DEAL_STAGE_BADGE_CLASSES[deal.stage]}>
                            {DEAL_STAGE_LABELS[deal.stage]}
                          </Badge>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <AiInsightsPanel entity={{ companyId: company.id }} />

          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardBody>
              <TaskList tasks={company.tasks} emptyMessage="No tasks yet." />
              <TaskQuickForm companyId={company.id} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <ActivityForm companyId={company.id} />
              <ActivityFeed activities={company.activities} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-slate-800 dark:text-slate-200">{value || "—"}</p>
    </div>
  );
}

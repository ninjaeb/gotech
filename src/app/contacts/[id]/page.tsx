import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteContact } from "@/app/actions/contacts";
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
import { formatCurrency, initials } from "@/lib/format";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const contact = await db.contact.findUnique({
    where: { id },
    include: {
      company: true,
      deals: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: [{ completed: "asc" }, { dueDate: "asc" }] },
      activities: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });

  if (!contact) notFound();

  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <div>
      <PageHeader
        title={fullName}
        description={
          [contact.title, contact.company?.name].filter(Boolean).join(" at ") ||
          undefined
        }
        actions={
          <>
            <Link
              href={`/contacts/${contact.id}/edit`}
              className={buttonClasses("secondary")}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <form action={deleteContact.bind(null, contact.id)}>
              <ConfirmSubmitButton confirmMessage="Delete this contact?">
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
            <CardBody>
              <div className="flex items-center gap-3 pb-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {initials(fullName)}
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {fullName}
                  </p>
                  {contact.company && (
                    <Link
                      href={`/companies/${contact.company.id}`}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      {contact.company.name}
                    </Link>
                  )}
                </div>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <DetailRow label="Email" value={contact.email} />
                <DetailRow label="Phone" value={contact.phone} />
                <DetailRow label="Title" value={contact.title} />
              </div>
              {contact.notes && (
                <div className="mt-3 text-sm">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {contact.notes}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deals ({contact.deals.length})</CardTitle>
              <Link
                href={`/deals/new?contactId=${contact.id}`}
                className={buttonClasses("secondary", "sm")}
              >
                <Plus className="h-4 w-4" />
                Add deal
              </Link>
            </CardHeader>
            <CardBody>
              {contact.deals.length === 0 ? (
                <EmptyState title="No deals linked to this contact yet." />
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
                  {contact.deals.map((deal) => (
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
                            {formatCurrency(deal.value.toString())}
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
          <AiInsightsPanel entity={{ contactId: contact.id }} />

          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardBody>
              <TaskList tasks={contact.tasks} emptyMessage="No tasks yet." />
              <TaskQuickForm contactId={contact.id} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <ActivityForm contactId={contact.id} />
              <ActivityFeed activities={contact.activities} />
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteDeal } from "@/app/actions/deals";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { ActivityForm } from "@/components/activity/activity-form";
import { TaskList } from "@/components/tasks/task-list";
import { TaskQuickForm } from "@/components/tasks/task-quick-form";
import { DealStageSelect } from "@/components/deals/deal-stage-select";
import { AiInsightsPanel } from "@/components/ai/ai-insights-panel";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const deal = await db.deal.findUnique({
    where: { id },
    include: {
      company: true,
      contact: true,
      tasks: { orderBy: [{ completed: "asc" }, { dueDate: "asc" }] },
      activities: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });

  if (!deal) notFound();

  return (
    <div>
      <PageHeader
        title={deal.title}
        description={
          [deal.company?.name, deal.contact && `${deal.contact.firstName} ${deal.contact.lastName}`]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        actions={
          <>
            <Link
              href={`/deals/${deal.id}/edit`}
              className={buttonClasses("secondary")}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <form action={deleteDeal.bind(null, deal.id)}>
              <ConfirmSubmitButton confirmMessage="Delete this deal?">
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
            <CardBody className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Stage
                </p>
                <div className="mt-1">
                  <DealStageSelect dealId={deal.id} stage={deal.stage} />
                </div>
              </div>
              <DetailRow label="Value" value={formatCurrency(deal.value.toString())} />
              <DetailRow
                label="Company"
                value={deal.company?.name ?? null}
                href={deal.company ? `/companies/${deal.company.id}` : undefined}
              />
              <DetailRow
                label="Contact"
                value={
                  deal.contact
                    ? `${deal.contact.firstName} ${deal.contact.lastName}`
                    : null
                }
                href={deal.contact ? `/contacts/${deal.contact.id}` : undefined}
              />
              <DetailRow
                label="Expected close date"
                value={deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : null}
              />
              {deal.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {deal.notes}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <AiInsightsPanel entity={{ dealId: deal.id }} />

          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardBody>
              <TaskList tasks={deal.tasks} emptyMessage="No tasks yet." />
              <TaskQuickForm dealId={deal.id} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <ActivityForm dealId={deal.id} />
              <ActivityFeed activities={deal.activities} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null;
  href?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      {href && value ? (
        <Link href={href} className="mt-0.5 block text-indigo-600 hover:underline">
          {value}
        </Link>
      ) : (
        <p className="mt-0.5 text-slate-800 dark:text-slate-200">{value || "—"}</p>
      )}
    </div>
  );
}

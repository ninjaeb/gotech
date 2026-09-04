import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Flag, Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteDeal } from "@/app/actions/deals";
import { DealResourceForm } from "@/components/deals/deal-resource-form";
import { DealResourceRow } from "@/components/deals/deal-resource-row";
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
import { DealStageSelect } from "@/components/deals/deal-stage-select";
import { SectionBoard } from "@/components/layout/section-board";
import { AiInsightsPanel } from "@/components/ai/ai-insights-panel";
import { Linkify } from "@/components/ui/linkify";
import { needsFollowUp } from "@/lib/deal-hygiene";
import { LEAD_SOURCE_LABELS, QUOTE_STATUS_BADGE_CLASSES, QUOTE_STATUS_LABELS } from "@/lib/labels";
import { quoteTotal } from "@/lib/quotes";
import { formatCurrency, formatDate, formatMinutes, fullName } from "@/lib/format";
import { getCurrency } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth/dal";
import { readSectionLayout } from "@/lib/section-layout";

const DEFAULT_LAYOUT = { main: ["tasks", "quotes", "resources", "activity"], sidebar: ["aiAssistant"] };

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await requireAdmin();

  const [currency, deal, timeLogged, users] = await Promise.all([
    getCurrency(),
    db.deal.findUnique({
      where: { id },
      include: {
        company: true,
        contact: true,
        owner: { select: { id: true, name: true } },
        pipelineStage: true,
        pipeline: { include: { stages: { orderBy: { sortOrder: "asc" } } } },
        tasks: {
          orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { priority: "desc" }],
          include: {
            assignees: { include: { user: { select: { id: true, name: true } } } },
            _count: { select: { followers: true } },
          },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { attachments: { select: { id: true, fileName: true, mimeType: true } } },
        },
        quotes: {
          orderBy: { createdAt: "desc" },
          include: { items: true },
        },
        resources: { orderBy: { createdAt: "desc" } },
        project: { select: { id: true, name: true } },
      },
    }),
    db.timeEntry.aggregate({ where: { task: { dealId: id } }, _sum: { minutes: true } }),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!deal) notFound();
  const totalMinutes = timeLogged._sum.minutes ?? 0;
  const layout = readSectionLayout(currentUser.sectionLayout, "deal", DEFAULT_LAYOUT);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Deals", href: "/deals" }, { label: deal.title }]}
        title={deal.title}
        description={
          [deal.company?.name, deal.contact && fullName(deal.contact.firstName, deal.contact.lastName)]
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

      <SectionBoard
        pageType="deal"
        initialLayout={layout}
        pinnedMain={
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Stage · {deal.pipeline.name}
                </p>
                <div className="mt-1">
                  <DealStageSelect
                    dealId={deal.id}
                    pipelineStageId={deal.pipelineStageId}
                    stages={deal.pipeline.stages}
                  />
                </div>
              </div>
              <DetailRow label="Value" value={formatCurrency(deal.value.toString(), currency)} />
              <DetailRow label="Owner" value={deal.owner?.name ?? "Unassigned"} />
              <DetailRow
                label="Company"
                value={deal.company?.name ?? null}
                href={deal.company ? `/companies/${deal.company.id}` : undefined}
              />
              <DetailRow
                label="Contact"
                value={deal.contact ? fullName(deal.contact.firstName, deal.contact.lastName) : null}
                href={deal.contact ? `/contacts/${deal.contact.id}` : undefined}
              />
              <DetailRow
                label="Expected close date"
                value={deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : null}
              />
              <DetailRow label="Source" value={deal.source ? LEAD_SOURCE_LABELS[deal.source] : null} />
              {deal.project && (
                <DetailRow
                  label="Project"
                  value={deal.project.name}
                  href={`/projects/${deal.project.id}`}
                />
              )}
              {deal.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Notes
                  </p>
                  <Linkify text={deal.notes} className="mt-1 text-slate-700 dark:text-slate-300" />
                </div>
              )}
            </CardBody>
          </Card>
        }
        sections={{
          aiAssistant: <AiInsightsPanel entity={{ dealId: deal.id }} />,
          tasks: (
                <Card>
                  <CardHeader>
                    <CardTitle>Tasks</CardTitle>
                    {totalMinutes > 0 && <Badge>{formatMinutes(totalMinutes)} logged</Badge>}
                  </CardHeader>
                  <CardBody>
                    {needsFollowUp(deal) && (
                      <div className="mb-3 flex items-center gap-2 rounded-md bg-orange-50 px-3 py-2 text-xs font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-400">
                        <Flag className="h-3.5 w-3.5 shrink-0" />
                        No next step scheduled — add one below.
                      </div>
                    )}
                    <TaskList tasks={deal.tasks} users={users} emptyMessage="No tasks yet." />
                    <TaskQuickForm dealId={deal.id} users={users} defaultAssigneeId={currentUser.id} />
                  </CardBody>
                </Card>
              ),
              quotes: (
                <Card>
                  <CardHeader>
                    <CardTitle>Quotes ({deal.quotes.length})</CardTitle>
                    <Link href={`/deals/${deal.id}/quotes/new`} className={buttonClasses("secondary", "sm")}>
                      <Plus className="h-4 w-4" />
                      New quote
                    </Link>
                  </CardHeader>
                  <CardBody>
                    {deal.quotes.length === 0 ? (
                      <EmptyState title="No quotes yet." />
                    ) : (
                      <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
                        {deal.quotes.map((quote) => (
                          <li key={quote.id}>
                            <Link
                              href={`/deals/${deal.id}/quotes/${quote.id}`}
                              className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-indigo-600"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                                <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                                  {quote.title}
                                </span>
                              </span>
                              <span className="flex shrink-0 items-center gap-3">
                                <span className="text-slate-500 dark:text-slate-400">
                                  {formatCurrency(quoteTotal(quote.items), currency)}
                                </span>
                                <Badge className={QUOTE_STATUS_BADGE_CLASSES[quote.status]}>
                                  {QUOTE_STATUS_LABELS[quote.status]}
                                </Badge>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardBody>
                </Card>
              ),
              resources: (
                <Card>
                  <CardHeader>
                    <CardTitle>Resources ({deal.resources.length})</CardTitle>
                  </CardHeader>
                  <CardBody>
                    {deal.resources.length === 0 ? (
                      <EmptyState
                        title="No resources yet."
                        description="Add a link to a proposal, presentation, or anything else related to this deal."
                      />
                    ) : (
                      <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
                        {deal.resources.map((resource) => (
                          <DealResourceRow key={resource.id} dealId={deal.id} resource={resource} />
                        ))}
                      </ul>
                    )}
                    <DealResourceForm dealId={deal.id} />
                  </CardBody>
                </Card>
              ),
              activity: (
                <Card>
                  <CardHeader>
                    <CardTitle>Activity</CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <ActivityForm dealId={deal.id} users={users} />
                    <ActivityFeed activities={deal.activities} users={users} />
                  </CardBody>
                </Card>
              ),
        }}
      />
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

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
import {
  LEAD_SOURCE_LABELS,
  QUOTE_DERIVED_BADGE_CLASSES,
  QUOTE_DERIVED_LABELS,
  QUOTE_STATUS_BADGE_CLASSES,
  QUOTE_STATUS_LABELS,
} from "@/lib/labels";
import { quoteDerivedState } from "@/lib/documents/dates";
import { formatCurrency, formatDate, formatDocumentMoney, formatDuration, formatMinutes, fullName } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { requireSales } from "@/lib/auth/dal";
import { readSectionLayout } from "@/lib/section-layout";

const DEFAULT_LAYOUT = { main: ["tasks", "quotes", "resources", "activity"], sidebar: ["aiAssistant"] };

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await requireSales();

  const [settings, deal, timeLogged, latestStageChange, users] = await Promise.all([
    getSettings(),
    db.deal.findUnique({
      where: { id },
      include: {
        company: true,
        contact: true,
        owner: { select: { id: true, name: true } },
        referredBy: { select: { id: true, name: true } },
        referralCommission: { select: { amount: true, status: true } },
        pipelineStage: true,
        pipeline: { include: { stages: { orderBy: { sortOrder: "asc" } } } },
        // Deal.tasks is the TaskDeal join table now that a task can belong
        // to more than one deal — order/select through the nested `task`
        // the same way this used to read straight off Task itself.
        tasks: {
          orderBy: [{ task: { completed: "asc" } }, { task: { dueDate: "asc" } }, { task: { priority: "desc" } }],
          include: {
            task: {
              include: {
                assignees: { include: { user: { select: { id: true, name: true } } } },
                _count: { select: { followers: true } },
              },
            },
          },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { attachments: { select: { id: true, fileName: true, mimeType: true } } },
        },
        quotes: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            status: true,
            number: true,
            revision: true,
            total: true,
            currency: true,
            validUntil: true,
            withdrawnAt: true,
            supersededById: true,
          },
        },
        resources: { orderBy: { createdAt: "desc" } },
        project: { select: { id: true, name: true } },
      },
    }),
    db.timeEntry.aggregate({ where: { task: { deals: { some: { dealId: id } } } }, _sum: { minutes: true } }),
    // The most recent stage change — same "days in stage" idiom as the
    // Deals kanban page (see daysInStage in deal-hygiene.ts) — gives an
    // honest closing timestamp for a Lost deal, which has no equivalent
    // to wonAt. A deal created straight into a stage (never moved) has no
    // STAGE_CHANGE activity at all; that's the null case below.
    db.activity.findFirst({
      where: { dealId: id, type: "STAGE_CHANGE" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.user.findMany({ where: { role: { not: "PARTNER" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!deal) notFound();
  const currency = settings.currency;
  // Deal.tasks comes back as TaskDeal join rows now — unwrap once here so
  // the rest of the page (needsFollowUp, TaskList) can work with plain
  // tasks exactly as before.
  const dealTasks = deal.tasks.map((link) => link.task);
  const totalMinutes = timeLogged._sum.minutes ?? 0;
  const layout = readSectionLayout(currentUser.sectionLayout, "deal", DEFAULT_LAYOUT);

  // Duration freezes once the deal is done, rather than growing forever
  // after the fact (see formatDuration's own doc comment) — wonAt already
  // captures exactly when a deal became Won; Lost has no such column, so it
  // falls back to the latest logged stage change, and finally to the
  // deal's own createdAt for one created directly into a Lost stage.
  const closedAt = deal.pipelineStage.isWon
    ? (deal.wonAt ?? latestStageChange?.createdAt ?? null)
    : deal.pipelineStage.isLost
      ? (latestStageChange?.createdAt ?? deal.createdAt)
      : null;
  const durationLabel = closedAt
    ? `${deal.pipelineStage.isWon ? "Won" : "Lost"} after ${formatDuration(deal.createdAt, closedAt)}`
    : `Running for ${formatDuration(deal.createdAt)}`;

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Deals", href: "/system/deals" }, { label: deal.title }]}
        title={deal.title}
        description={
          [deal.company?.name, deal.contact && fullName(deal.contact.firstName, deal.contact.lastName)]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        actions={
          <>
            <Link
              href={`/system/deals/${deal.id}/edit`}
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
                href={deal.company ? `/system/companies/${deal.company.id}` : undefined}
              />
              <DetailRow
                label="Contact"
                value={deal.contact ? fullName(deal.contact.firstName, deal.contact.lastName) : null}
                href={deal.contact ? `/system/contacts/${deal.contact.id}` : undefined}
              />
              <DetailRow label="Started" value={formatDate(deal.createdAt)} />
              <DetailRow label="Duration" value={durationLabel} />
              <DetailRow
                label="Expected close date"
                value={deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : null}
              />
              <DetailRow label="Source" value={deal.source ? LEAD_SOURCE_LABELS[deal.source] : null} />
              {deal.referredBy && (
                <DetailRow
                  label="Referred by"
                  value={
                    deal.referralCommission
                      ? `${deal.referredBy.name} · ${formatCurrency(deal.referralCommission.amount.toString(), currency)} commission (${deal.referralCommission.status.toLowerCase()})`
                      : `${deal.referredBy.name} (partner)`
                  }
                  href="/system/referrals"
                />
              )}
              {deal.project && (
                <DetailRow
                  label="Project"
                  value={deal.project.name}
                  href={`/system/projects/${deal.project.id}`}
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
                    {needsFollowUp({ pipelineStage: deal.pipelineStage, tasks: dealTasks }) && (
                      <div className="mb-3 flex items-center gap-2 rounded-md bg-orange-50 px-3 py-2 text-xs font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-400">
                        <Flag className="h-3.5 w-3.5 shrink-0" />
                        No next step scheduled — add one below.
                      </div>
                    )}
                    <TaskList tasks={dealTasks} users={users} emptyMessage="No tasks yet." />
                    <TaskQuickForm dealId={deal.id} users={users} defaultAssigneeId={currentUser.id} />
                  </CardBody>
                </Card>
              ),
              quotes: (
                <Card>
                  <CardHeader>
                    <CardTitle>Quotes ({deal.quotes.length})</CardTitle>
                    <Link href={`/system/deals/${deal.id}/quotes/new`} className={buttonClasses("secondary", "sm")}>
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
                              href={`/system/deals/${deal.id}/quotes/${quote.id}`}
                              className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-indigo-600"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                                <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                                  {quote.number ? `${quote.number}${quote.revision > 1 ? ` Rev ${quote.revision}` : ""} · ` : ""}
                                  {quote.title}
                                </span>
                              </span>
                              <span className="flex shrink-0 items-center gap-3">
                                <span className="text-slate-500 dark:text-slate-400">
                                  {formatDocumentMoney(quote.total.toString(), quote.currency)}
                                </span>
                                {(() => {
                                  const derived = quoteDerivedState(quote, settings.bookingUtcOffsetMinutes);
                                  return derived ? (
                                    <Badge className={QUOTE_DERIVED_BADGE_CLASSES[derived]}>{QUOTE_DERIVED_LABELS[derived]}</Badge>
                                  ) : (
                                    <Badge className={QUOTE_STATUS_BADGE_CLASSES[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Badge>
                                  );
                                })()}
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
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      {href && value ? (
        <Link href={href} className="mt-0.5 block break-words text-indigo-600 hover:underline">
          {value}
        </Link>
      ) : (
        <p className="mt-0.5 break-words text-slate-800 dark:text-slate-200">{value || "—"}</p>
      )}
    </div>
  );
}

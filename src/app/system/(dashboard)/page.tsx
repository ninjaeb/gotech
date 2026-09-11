import Link from "next/link";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  Clock,
  FileText,
  Flag,
  FolderKanban,
  Hourglass,
  Plus,
  Receipt,
  Star,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskList } from "@/components/tasks/task-list";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { AiPipelineDiagnosis } from "@/components/dashboard/ai-pipeline-diagnosis";
import { LEAD_SOURCE_LABELS, stageBadgeClasses } from "@/lib/labels";
import { getDefaultPipeline } from "@/lib/pipelines";
import { computeProjectActuals, budgetSeverity, timelineSeverity } from "@/lib/project-budget";
import { formatCurrency, fullName } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { orgToday } from "@/lib/documents/dates";
import { requireSales } from "@/lib/auth/dal";

export default async function DashboardPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
  const startOfNextMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth() + 1, 1);
  const sevenDaysOut = new Date(startOfToday);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  const thirtyDaysAgo = new Date(startOfToday);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const currentUser = await requireSales();
  const contactSelect = { id: true, firstName: true, lastName: true, email: true, phone: true } as const;
  // Quote validity is a calendar date in the org's own timezone (see
  // src/lib/documents/dates.ts), not the server's.
  const settings = await getSettings();
  const currency = settings.currency;
  const orgDay = orgToday(settings.bookingUtcOffsetMinutes);

  const [
    openQuoteCount,
    companyCount,
    contactCount,
    allDeals,
    tasksDueTodayCount,
    overdueTasksCount,
    needsFollowUpCount,
    myTasks,
    followedTasks,
    topOpenDeals,
    defaultPipeline,
    users,
    hasEmailAccount,
    hasWhatsAppAccount,
    outstandingInvoices,
    overdueInvoiceCount,
    quoteStatusCounts,
    activeProjects,
    testimonialStats,
    dealsClosingThisMonthCount,
    upcomingBookingsCount,
    companyCount30dAgo,
    contactCount30dAgo,
  ] = await Promise.all([
    // "Awaiting response" = issued, still open: not withdrawn, not replaced
    // by a revision, not past its valid-until date.
    db.quote.count({
      where: {
        status: { in: ["SENT", "VIEWED"] },
        withdrawnAt: null,
        supersededById: null,
        OR: [{ validUntil: null }, { validUntil: { gte: orgDay } }],
      },
    }),
    db.company.count(),
    db.contact.count(),
    db.deal.findMany({
      select: {
        id: true,
        title: true,
        value: true,
        pipelineStageId: true,
        source: true,
        createdAt: true,
        pipelineStage: { select: { isWon: true, isLost: true } },
      },
    }),
    db.task.count({
      where: {
        assignees: { some: { userId: currentUser.id } },
        completed: false,
        dueDate: { gte: startOfToday, lt: endOfToday },
      },
    }),
    db.task.count({
      where: { assignees: { some: { userId: currentUser.id } }, completed: false, dueDate: { lt: startOfToday } },
    }),
    db.deal.count({
      where: {
        pipelineStage: { isWon: false, isLost: false },
        tasks: { none: { completed: false, dueDate: { not: null } } },
      },
    }),
    db.task.findMany({
      where: { assignees: { some: { userId: currentUser.id } }, completed: false },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: {
        contact: { select: contactSelect },
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true, contact: { select: contactSelect } } },
        project: {
          select: { id: true, name: true, deal: { select: { id: true, title: true, contact: { select: contactSelect } } } },
        },
        assignees: { include: { user: { select: { id: true, name: true } } } },
        _count: { select: { followers: true } },
      },
    }),
    db.task.findMany({
      where: { followers: { some: { userId: currentUser.id } }, completed: false },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: {
        contact: { select: contactSelect },
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true, contact: { select: contactSelect } } },
        project: {
          select: { id: true, name: true, deal: { select: { id: true, title: true, contact: { select: contactSelect } } } },
        },
        assignees: { include: { user: { select: { id: true, name: true } } } },
        _count: { select: { followers: true } },
      },
    }),
    db.deal.findMany({
      where: { pipelineStage: { isWon: false, isLost: false } },
      orderBy: { value: "desc" },
      take: 5,
      include: { company: true, contact: true, pipelineStage: true },
    }),
    getDefaultPipeline(),
    db.user.findMany({ where: { role: { not: "PARTNER" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.emailAccount.findUnique({ where: { userId: currentUser.id }, select: { id: true } }).then(Boolean),
    db.whatsAppAccount.findUnique({ where: { id: "singleton" }, select: { id: true } }).then(Boolean),
    db.invoice.aggregate({
      where: { status: { in: ["DEPOSIT_SENT", "PROGRESS_BILLED"] } },
      _sum: { amount: true },
      _count: true,
    }),
    db.invoice.count({
      where: { status: { in: ["DEPOSIT_SENT", "PROGRESS_BILLED"] }, dueDate: { lt: startOfToday } },
    }),
    db.quote.groupBy({ by: ["status"], _count: { _all: true } }),
    db.project.findMany({
      where: { status: { in: ["NOT_STARTED", "IN_PROGRESS"] } },
      select: {
        status: true,
        budgetHours: true,
        budgetAmount: true,
        targetCompletionDate: true,
        tasks: { select: { timeEntries: { select: { minutes: true, user: { select: { hourlyRate: true } } } } } },
      },
    }),
    db.testimonial.aggregate({
      where: { status: "SUBMITTED" },
      _count: true,
      _avg: { rating: true },
    }),
    db.deal.count({
      where: {
        pipelineStage: { isWon: false, isLost: false },
        expectedCloseDate: { gte: startOfMonth, lt: startOfNextMonth },
      },
    }),
    db.booking.count({ where: { startAt: { gte: startOfToday, lt: sevenDaysOut } } }),
    db.company.count({ where: { createdAt: { lt: thirtyDaysAgo } } }),
    db.contact.count({ where: { createdAt: { lt: thirtyDaysAgo } } }),
  ]);

  const openDeals = allDeals.filter((deal) => !deal.pipelineStage.isWon && !deal.pipelineStage.isLost);
  const wonDeals = allDeals.filter((deal) => deal.pipelineStage.isWon);
  const lostDeals = allDeals.filter((deal) => deal.pipelineStage.isLost);

  const openPipelineValue = openDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
  const closedRevenue = wonDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
  const lostValue = lostDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
  const decidedCount = wonDeals.length + lostDeals.length;
  const winRate = decidedCount > 0 ? Math.round((wonDeals.length / decidedCount) * 100) : null;

  const totalTracked = openPipelineValue + closedRevenue + lostValue;
  const wonShare = totalTracked > 0 ? (closedRevenue / totalTracked) * 100 : 0;
  const openShare = totalTracked > 0 ? (openPipelineValue / totalTracked) * 100 : 0;
  const lostShare = totalTracked > 0 ? (lostValue / totalTracked) * 100 : 0;

  // Scoped to the default pipeline — stage names (and which stages even
  // exist) vary by pipeline, so a stage-by-stage breakdown can't be summed
  // across all of them the way the totals above can.
  const stageBreakdown = defaultPipeline.stages
    .filter((stage) => !stage.isWon && !stage.isLost)
    .map((stage) => {
      const deals = openDeals.filter((deal) => deal.pipelineStageId === stage.id);
      return {
        stage,
        count: deals.length,
        value: deals.reduce((sum, deal) => sum + Number(deal.value), 0),
      };
    });
  const maxStageValue = Math.max(1, ...stageBreakdown.map((s) => s.value));

  // Every deal ever created (not just open ones) — this is about where
  // leads have historically come from, not current pipeline composition.
  // "Unknown" (source is null) covers everything created before this field
  // existed plus any manually-created deal where it was left blank; shown
  // rather than hidden so the breakdown never silently omits deals.
  const sourceGroups = new Map<string, { label: string; count: number; value: number }>();
  for (const deal of allDeals) {
    const key = deal.source ?? "UNKNOWN";
    const label = deal.source ? LEAD_SOURCE_LABELS[deal.source] : "Unknown";
    const entry = sourceGroups.get(key) ?? { label, count: 0, value: 0 };
    entry.count += 1;
    entry.value += Number(deal.value);
    sourceGroups.set(key, entry);
  }
  const sourceBreakdown = Array.from(sourceGroups.entries())
    .map(([key, entry]) => ({ key, ...entry }))
    .sort((a, b) => b.count - a.count);
  const maxSourceValue = Math.max(1, ...sourceBreakdown.map((s) => s.value));

  const outstandingInvoiceAmount = Number(outstandingInvoices._sum.amount ?? 0);
  const outstandingInvoiceCount = outstandingInvoices._count;

  const quotesByStatus = new Map<string, number>(
    quoteStatusCounts.map((row) => [row.status, row._count._all]),
  );
  const quotesAwaitingCount = openQuoteCount;
  const quotesAccepted = quotesByStatus.get("ACCEPTED") ?? 0;
  const quotesDecided = quotesAccepted + (quotesByStatus.get("DECLINED") ?? 0);
  const quoteAcceptanceRate = quotesDecided > 0 ? Math.round((quotesAccepted / quotesDecided) * 100) : null;

  // Same over-budget/over-timeline check as the projects list page — see
  // src/app/(app)/projects/page.tsx — just tallied instead of shown per-row.
  const flaggedProjectCount = activeProjects.filter((project) => {
    const { totalMinutes, totalCost } = computeProjectActuals(project.tasks.flatMap((task) => task.timeEntries));
    const overHours = budgetSeverity(totalMinutes / 60, project.budgetHours) === "over";
    const overCost =
      budgetSeverity(totalCost, project.budgetAmount === null ? null : Number(project.budgetAmount)) === "over";
    const overTimeline = timelineSeverity(project.targetCompletionDate, project.status) === "over";
    return overHours || overCost || overTimeline;
  }).length;

  const testimonialCount = testimonialStats._count;
  const avgTestimonialRating = testimonialStats._avg.rating;

  let oldestOpenDeal: (typeof openDeals)[number] | null = null;
  for (const deal of openDeals) {
    if (!oldestOpenDeal || deal.createdAt < oldestOpenDeal.createdAt) oldestOpenDeal = deal;
  }
  const oldestOpenDealDays = oldestOpenDeal
    ? Math.floor((startOfToday.getTime() - oldestOpenDeal.createdAt.getTime()) / 86_400_000)
    : null;

  const companyDelta = companyCount - companyCount30dAgo;
  const contactDelta = contactCount - contactCount30dAgo;
  const companyDeltaLabel =
    companyDelta > 0 ? `+${companyDelta} this month` : companyDelta < 0 ? `${companyDelta} this month` : "No change this month";
  const contactDeltaLabel =
    contactDelta > 0 ? `+${contactDelta} this month` : contactDelta < 0 ? `${contactDelta} this month` : "No change this month";

  return (
    <div>
      <PageHeader title="Dashboard" description="Your CRM at a glance" />

      <div className="mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-300">
              Pipeline overview
            </p>
            <p className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
              {formatCurrency(openPipelineValue, currency)}
              <span className="ml-2 text-base font-normal text-slate-400">open pipeline</span>
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {formatCurrency(closedRevenue, currency)} closed-won
              {winRate !== null && ` · ${winRate}% win rate`}
            </p>
          </div>
          <Link href="/system/deals/new" className={buttonClasses()}>
            <Plus className="h-4 w-4" />
            New deal
          </Link>
        </div>

        {totalTracked > 0 && (
          <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-white/10">
            <div className="bg-emerald-400" style={{ width: `${wonShare}%` }} />
            <div className="bg-indigo-400" style={{ width: `${openShare}%` }} />
            <div className="bg-rose-400" style={{ width: `${lostShare}%` }} />
          </div>
        )}

        <AiPipelineDiagnosis />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Companies"
          value={companyCount.toString()}
          icon={Building2}
          accent="indigo"
          description={companyDeltaLabel}
          href="/system/companies"
        />
        <StatCard
          label="Contacts"
          value={contactCount.toString()}
          icon={Users}
          accent="sky"
          description={contactDeltaLabel}
          href="/system/contacts"
        />
        <StatCard
          label="My tasks due today"
          value={tasksDueTodayCount.toString()}
          icon={CheckSquare}
          accent="amber"
          href={`/system/tasks?filter=today&assignee=${currentUser.id}`}
        />
        <StatCard
          label="My overdue tasks"
          value={overdueTasksCount.toString()}
          icon={Clock}
          accent="rose"
          description={overdueTasksCount > 0 ? "Needs attention" : "All caught up"}
          href={`/system/tasks?filter=overdue&assignee=${currentUser.id}`}
        />
        <StatCard
          label="Needs follow-up"
          value={needsFollowUpCount.toString()}
          icon={Flag}
          accent="orange"
          description={needsFollowUpCount > 0 ? "Open deals, no next step" : "All deals on track"}
          href="/system/deals?flag=needs-follow-up"
        />
      </div>

      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Revenue &amp; delivery
      </p>
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Outstanding invoices"
          value={formatCurrency(outstandingInvoiceAmount, currency)}
          icon={Receipt}
          accent="emerald"
          description={
            outstandingInvoiceCount === 0
              ? "Nothing sent yet"
              : overdueInvoiceCount > 0
                ? `${overdueInvoiceCount} overdue`
                : "All within terms"
          }
        />
        <StatCard
          label="Quotes awaiting response"
          value={quotesAwaitingCount.toString()}
          icon={FileText}
          accent="sky"
          description={quoteAcceptanceRate !== null ? `${quoteAcceptanceRate}% acceptance rate` : "No decided quotes yet"}
        />
        <StatCard
          label="Active projects"
          value={activeProjects.length.toString()}
          icon={FolderKanban}
          accent="orange"
          description={flaggedProjectCount > 0 ? `${flaggedProjectCount} over budget` : "All on track"}
          href="/system/projects"
        />
        <StatCard
          label="Testimonials collected"
          value={testimonialCount.toString()}
          icon={Star}
          accent="amber"
          description={avgTestimonialRating !== null ? `${avgTestimonialRating.toFixed(1)}★ average` : "No ratings yet"}
        />
      </div>

      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Coming up
      </p>
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Deals closing this month"
          value={dealsClosingThisMonthCount.toString()}
          icon={CalendarClock}
          accent="indigo"
          href="/system/deals"
        />
        <StatCard
          label="Bookings, next 7 days"
          value={upcomingBookingsCount.toString()}
          icon={CalendarDays}
          accent="sky"
        />
        <StatCard
          label="Oldest open deal"
          value={oldestOpenDealDays !== null ? `${oldestOpenDealDays}d` : "—"}
          icon={Hourglass}
          accent="rose"
          description={oldestOpenDeal?.title}
          href={oldestOpenDeal ? `/system/deals/${oldestOpenDeal.id}` : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{defaultPipeline.name} by stage</CardTitle>
              <Link href="/system/deals" className="text-sm font-medium text-indigo-600 hover:underline">
                View board
              </Link>
            </CardHeader>
            <CardBody className="space-y-4">
              {stageBreakdown.map(({ stage, count, value }) => (
                <Link
                  key={stage.id}
                  href={`/system/deals?pipeline=${defaultPipeline.id}#stage-${stage.id}`}
                  className="-mx-2 block rounded-md px-2 py-1 transition-colors hover:bg-slate-50 dark:hover:bg-neutral-800"
                >
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {stage.name} <span className="font-normal text-slate-400">({count})</span>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">{formatCurrency(value, currency)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(value / maxStageValue) * 100}%` }}
                    />
                  </div>
                </Link>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>High-value open deals</CardTitle>
              <Link href="/system/deals" className="text-sm font-medium text-indigo-600 hover:underline">
                View all deals
              </Link>
            </CardHeader>
            <CardBody>
              {topOpenDeals.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  No open deals yet.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
                  {topOpenDeals.map((deal) => (
                    <li key={deal.id}>
                      <Link
                        href={`/system/deals/${deal.id}`}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-indigo-600"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800 dark:text-slate-200">
                            {deal.title}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {deal.company?.name ??
                              (deal.contact ? fullName(deal.contact.firstName, deal.contact.lastName) : "No company")}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {formatCurrency(deal.value.toString(), currency)}
                          </span>
                          <Badge className={stageBadgeClasses(deal.pipelineStage)}>
                            {deal.pipelineStage.name}
                          </Badge>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deals by source</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {sourceBreakdown.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  No deals yet.
                </p>
              ) : (
                sourceBreakdown.map(({ key, label, count, value }) => (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {label} <span className="font-normal text-slate-400">({count})</span>
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">{formatCurrency(value, currency)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
                      <div
                        className={key === "UNKNOWN" ? "h-full rounded-full bg-slate-300 dark:bg-neutral-600" : "h-full rounded-full bg-indigo-500"}
                        style={{ width: `${(value / maxSourceValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Tasks</CardTitle>
              <Link href="/system/tasks" className="text-sm font-medium text-indigo-600 hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardBody>
              <TaskList
                tasks={myTasks}
                users={users}
                showParent
                hasEmailAccount={hasEmailAccount}
                hasWhatsAppAccount={hasWhatsAppAccount}
                emptyMessage="Nothing assigned to you — nice work!"
                stackActions
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tasks I Follow</CardTitle>
            </CardHeader>
            <CardBody>
              <TaskList
                tasks={followedTasks}
                users={users}
                showParent
                hasEmailAccount={hasEmailAccount}
                hasWhatsAppAccount={hasWhatsAppAccount}
                emptyMessage="You're not following any open tasks."
                stackActions
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

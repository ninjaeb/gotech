import Link from "next/link";
import { Building2, CheckSquare, Clock, Flag, Plus, Users } from "lucide-react";
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
import { formatCurrency, fullName } from "@/lib/format";
import { getCurrency } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth/dal";

export default async function DashboardPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const currentUser = await requireAdmin();
  const contactSelect = { id: true, firstName: true, lastName: true, email: true, phone: true } as const;

  const [
    currency,
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
  ] = await Promise.all([
    getCurrency(),
    db.company.count(),
    db.contact.count(),
    db.deal.findMany({
      select: {
        value: true,
        pipelineStageId: true,
        source: true,
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
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.emailAccount.findUnique({ where: { userId: currentUser.id }, select: { id: true } }).then(Boolean),
    db.whatsAppAccount.findUnique({ where: { id: "singleton" }, select: { id: true } }).then(Boolean),
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
          <Link href="/deals/new" className={buttonClasses()}>
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Companies"
          value={companyCount.toString()}
          icon={Building2}
          accent="indigo"
          href="/companies"
        />
        <StatCard
          label="Contacts"
          value={contactCount.toString()}
          icon={Users}
          accent="sky"
          href="/contacts"
        />
        <StatCard
          label="My tasks due today"
          value={tasksDueTodayCount.toString()}
          icon={CheckSquare}
          accent="amber"
          href={`/tasks?filter=today&assignee=${currentUser.id}`}
        />
        <StatCard
          label="My overdue tasks"
          value={overdueTasksCount.toString()}
          icon={Clock}
          accent="rose"
          description={overdueTasksCount > 0 ? "Needs attention" : "All caught up"}
          href={`/tasks?filter=overdue&assignee=${currentUser.id}`}
        />
        <StatCard
          label="Needs follow-up"
          value={needsFollowUpCount.toString()}
          icon={Flag}
          accent="orange"
          description={needsFollowUpCount > 0 ? "Open deals, no next step" : "All deals on track"}
          href="/deals?flag=needs-follow-up"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{defaultPipeline.name} by stage</CardTitle>
              <Link href="/deals" className="text-sm font-medium text-indigo-600 hover:underline">
                View board
              </Link>
            </CardHeader>
            <CardBody className="space-y-4">
              {stageBreakdown.map(({ stage, count, value }) => (
                <Link
                  key={stage.id}
                  href={`/deals?pipeline=${defaultPipeline.id}#stage-${stage.id}`}
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
              <Link href="/deals" className="text-sm font-medium text-indigo-600 hover:underline">
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
                        href={`/deals/${deal.id}`}
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
              <Link href="/tasks" className="text-sm font-medium text-indigo-600 hover:underline">
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
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

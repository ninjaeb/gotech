import Link from "next/link";
import { Building2, CheckSquare, Clock, Plus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskList } from "@/components/tasks/task-list";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { AiPipelineDiagnosis } from "@/components/dashboard/ai-pipeline-diagnosis";
import { DEAL_STAGES, DEAL_STAGE_BADGE_CLASSES, DEAL_STAGE_LABELS } from "@/lib/labels";
import { formatCurrency } from "@/lib/format";

const OPEN_STAGES = DEAL_STAGES.filter((stage) => stage !== "WON" && stage !== "LOST");

export default async function DashboardPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [
    companyCount,
    contactCount,
    allDeals,
    tasksDueTodayCount,
    overdueTasksCount,
    upcomingTasks,
    topOpenDeals,
  ] = await Promise.all([
    db.company.count(),
    db.contact.count(),
    db.deal.findMany({ select: { value: true, stage: true } }),
    db.task.count({
      where: { completed: false, dueDate: { gte: startOfToday, lt: endOfToday } },
    }),
    db.task.count({
      where: { completed: false, dueDate: { lt: startOfToday } },
    }),
    db.task.findMany({
      where: { completed: false },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 6,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true } },
      },
    }),
    db.deal.findMany({
      where: { stage: { notIn: ["WON", "LOST"] } },
      orderBy: { value: "desc" },
      take: 5,
      include: { company: true, contact: true },
    }),
  ]);

  const openDeals = allDeals.filter((deal) => deal.stage !== "WON" && deal.stage !== "LOST");
  const wonDeals = allDeals.filter((deal) => deal.stage === "WON");
  const lostDeals = allDeals.filter((deal) => deal.stage === "LOST");

  const openPipelineValue = openDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
  const closedRevenue = wonDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
  const lostValue = lostDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
  const decidedCount = wonDeals.length + lostDeals.length;
  const winRate = decidedCount > 0 ? Math.round((wonDeals.length / decidedCount) * 100) : null;

  const totalTracked = openPipelineValue + closedRevenue + lostValue;
  const wonShare = totalTracked > 0 ? (closedRevenue / totalTracked) * 100 : 0;
  const openShare = totalTracked > 0 ? (openPipelineValue / totalTracked) * 100 : 0;
  const lostShare = totalTracked > 0 ? (lostValue / totalTracked) * 100 : 0;

  const stageBreakdown = OPEN_STAGES.map((stage) => {
    const deals = openDeals.filter((deal) => deal.stage === stage);
    return {
      stage,
      count: deals.length,
      value: deals.reduce((sum, deal) => sum + Number(deal.value), 0),
    };
  });
  const maxStageValue = Math.max(1, ...stageBreakdown.map((s) => s.value));

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
              {formatCurrency(openPipelineValue)}
              <span className="ml-2 text-base font-normal text-slate-400">open pipeline</span>
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {formatCurrency(closedRevenue)} closed-won
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Companies" value={companyCount.toString()} icon={Building2} accent="indigo" />
        <StatCard label="Contacts" value={contactCount.toString()} icon={Users} accent="sky" />
        <StatCard
          label="Tasks due today"
          value={tasksDueTodayCount.toString()}
          icon={CheckSquare}
          accent="amber"
        />
        <StatCard
          label="Overdue tasks"
          value={overdueTasksCount.toString()}
          icon={Clock}
          accent="rose"
          description={overdueTasksCount > 0 ? "Needs attention" : "All caught up"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline by stage</CardTitle>
              <Link href="/deals" className="text-sm font-medium text-indigo-600 hover:underline">
                View board
              </Link>
            </CardHeader>
            <CardBody className="space-y-4">
              {stageBreakdown.map(({ stage, count, value }) => (
                <div key={stage}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {DEAL_STAGE_LABELS[stage]}{" "}
                      <span className="font-normal text-slate-400">({count})</span>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">{formatCurrency(value)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(value / maxStageValue) * 100}%` }}
                    />
                  </div>
                </div>
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
                              (deal.contact
                                ? `${deal.contact.firstName} ${deal.contact.lastName}`
                                : "No company")}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {formatCurrency(deal.value.toString())}
                          </span>
                          <Badge className={DEAL_STAGE_BADGE_CLASSES[deal.stage]}>
                            {DEAL_STAGE_LABELS[deal.stage]}
                          </Badge>
                        </div>
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
            <CardTitle>Upcoming tasks</CardTitle>
            <Link href="/tasks" className="text-sm font-medium text-indigo-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardBody>
            <TaskList tasks={upcomingTasks} showParent emptyMessage="No open tasks — nice work!" />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Building2, CheckSquare, DollarSign, Users } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskList } from "@/components/tasks/task-list";
import { Badge } from "@/components/ui/badge";
import { DEAL_STAGES, DEAL_STAGE_BADGE_CLASSES, DEAL_STAGE_LABELS } from "@/lib/labels";
import { formatCurrency } from "@/lib/format";

export default async function DashboardPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [
    companyCount,
    contactCount,
    openDeals,
    tasksDueTodayCount,
    upcomingTasks,
  ] = await Promise.all([
    db.company.count(),
    db.contact.count(),
    db.deal.findMany({
      where: { stage: { notIn: ["WON", "LOST"] } },
      select: { value: true, stage: true },
    }),
    db.task.count({
      where: {
        completed: false,
        dueDate: { gte: startOfToday, lt: endOfToday },
      },
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
  ]);

  const openPipelineValue = openDeals.reduce(
    (sum, deal) => sum + Number(deal.value),
    0,
  );

  const stageBreakdown = DEAL_STAGES.map((stage) => {
    const deals = openDeals.filter((deal) => deal.stage === stage);
    return {
      stage,
      count: deals.length,
      value: deals.reduce((sum, deal) => sum + Number(deal.value), 0),
    };
  }).filter((s) => s.stage !== "WON" && s.stage !== "LOST");

  return (
    <div>
      <PageHeader title="Dashboard" description="Your CRM at a glance" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Companies" value={companyCount.toString()} icon={Building2} accent="indigo" />
        <StatCard label="Contacts" value={contactCount.toString()} icon={Users} accent="sky" />
        <StatCard
          label="Open pipeline value"
          value={formatCurrency(openPipelineValue)}
          icon={DollarSign}
          accent="emerald"
        />
        <StatCard
          label="Tasks due today"
          value={tasksDueTodayCount.toString()}
          icon={CheckSquare}
          accent="amber"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming tasks</CardTitle>
            <Link href="/tasks" className="text-sm font-medium text-indigo-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardBody>
            <TaskList
              tasks={upcomingTasks}
              showParent
              emptyMessage="No open tasks — nice work!"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline by stage</CardTitle>
            <Link href="/deals" className="text-sm font-medium text-indigo-600 hover:underline">
              View board
            </Link>
          </CardHeader>
          <CardBody>
            <ul className="space-y-3">
              {stageBreakdown.map(({ stage, count, value }) => (
                <li key={stage} className="flex items-center justify-between text-sm">
                  <Badge className={DEAL_STAGE_BADGE_CLASSES[stage]}>
                    {DEAL_STAGE_LABELS[stage]}
                  </Badge>
                  <span className="text-slate-500 dark:text-slate-400">
                    {count} · {formatCurrency(value)}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

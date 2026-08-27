import Link from "next/link";
import { Clock, Flag, Plus, Search } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/field";
import { buttonClasses } from "@/components/ui/button";
import { DealStageSelect } from "@/components/deals/deal-stage-select";
import { getPipelinesWithStages, getDefaultPipeline } from "@/lib/pipelines";
import { daysInStage, isRotting, needsFollowUp } from "@/lib/deal-hygiene";
import { formatCurrency, formatDate, fullName } from "@/lib/format";
import { getCurrency } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth/dal";
import type { Prisma } from "@/generated/prisma/client";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; flag?: string; pipeline?: string }>;
}) {
  await requireAdmin();
  const { q, flag, pipeline: pipelineParam } = await searchParams;
  const query = q?.trim();
  const flagged = flag === "needs-follow-up";

  const [currency, pipelines, defaultPipeline] = await Promise.all([
    getCurrency(),
    getPipelinesWithStages(),
    getDefaultPipeline(),
  ]);
  const selectedPipeline =
    pipelines.find((pipeline) => pipeline.id === pipelineParam) ??
    pipelines.find((pipeline) => pipeline.id === defaultPipeline.id) ??
    pipelines[0];

  const conditions: Prisma.DealWhereInput[] = [{ pipelineId: selectedPipeline.id }];
  if (query) {
    conditions.push({
      OR: [
        { title: { contains: query } },
        { notes: { contains: query } },
        { company: { name: { contains: query } } },
        { contact: { firstName: { contains: query } } },
        { contact: { lastName: { contains: query } } },
      ],
    });
  }
  if (flagged) {
    conditions.push({
      pipelineStage: { isWon: false, isLost: false },
      tasks: { none: { completed: false, dueDate: { not: null } } },
    });
  }

  const deals = await db.deal.findMany({
    where: { AND: conditions },
    orderBy: { createdAt: "desc" },
    include: {
      company: true,
      contact: true,
      pipelineStage: true,
      tasks: { select: { completed: true, dueDate: true } },
      activities: {
        where: { type: "STAGE_CHANGE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  const columns = selectedPipeline.stages.map((stage) => {
    const stageDeals = deals.filter((deal) => deal.pipelineStageId === stage.id);
    const total = stageDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
    return { stage, deals: stageDeals, total };
  });

  return (
    <div>
      <PageHeader
        title="Deals"
        description={`${deals.length} ${deals.length === 1 ? "deal" : "deals"} in ${selectedPipeline.name}`}
        actions={
          <Link href={`/deals/new?pipelineId=${selectedPipeline.id}`} className={buttonClasses()}>
            <Plus className="h-4 w-4" />
            New deal
          </Link>
        }
      />

      {pipelines.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {pipelines.map((pipeline) => (
            <Link
              key={pipeline.id}
              href={`/deals?pipeline=${pipeline.id}`}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                pipeline.id === selectedPipeline.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-700",
              )}
            >
              {pipeline.name}
            </Link>
          ))}
        </div>
      )}

      <form className="mb-4">
        <input type="hidden" name="pipeline" value={selectedPipeline.id} />
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search deals…"
            className="pl-9"
          />
        </div>
      </form>

      {flagged && (
        <div className="mb-4 flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400">
          <Flag className="h-4 w-4" />
          Showing open deals with no next step scheduled
          <Link
            href={`/deals?pipeline=${selectedPipeline.id}`}
            className="text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Clear
          </Link>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.stage.id} id={`stage-${column.stage.id}`} className="w-72 shrink-0 scroll-mt-4">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {column.stage.name}
                <span className="ml-1.5 text-xs font-normal text-slate-400">
                  {column.deals.length}
                </span>
              </h3>
              <span className="text-xs font-medium text-slate-400">
                {formatCurrency(column.total, currency)}
              </span>
            </div>
            <div className="min-h-16 space-y-2 rounded-lg bg-slate-100/70 p-2 dark:bg-neutral-900/60">
              {column.deals.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-slate-400">
                  {query || flagged ? "No matches" : "No deals"}
                </p>
              ) : (
                column.deals.map((deal) => {
                  const latestStageChangeAt = deal.activities[0]?.createdAt ?? null;
                  const dealWithStageTiming = { ...deal, latestStageChangeAt };
                  const rotting = isRotting(dealWithStageTiming);

                  return (
                  <div
                    key={deal.id}
                    className="rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <Link href={`/deals/${deal.id}`} className="block">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {deal.title}
                        </p>
                        <span className="flex shrink-0 items-center gap-1">
                          {rotting && (
                            <span
                              title={`${daysInStage(dealWithStageTiming)} days in ${deal.pipelineStage.name}`}
                              className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950 dark:text-rose-400 dark:ring-rose-500/30"
                            >
                              <Clock className="h-3 w-3" />
                              {daysInStage(dealWithStageTiming)}d
                            </span>
                          )}
                          {needsFollowUp(deal) && (
                            <span
                              title="No next step scheduled"
                              className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20 dark:bg-orange-950 dark:text-orange-400 dark:ring-orange-500/30"
                            >
                              <Flag className="h-3 w-3" />
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {deal.company?.name ??
                          (deal.contact ? fullName(deal.contact.firstName, deal.contact.lastName) : "No company")}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {formatCurrency(deal.value.toString(), currency)}
                        </span>
                        {deal.expectedCloseDate && (
                          <span className="text-xs text-slate-400">
                            {formatDate(deal.expectedCloseDate)}
                          </span>
                        )}
                      </div>
                    </Link>
                    <div className="mt-2">
                      <DealStageSelect
                        dealId={deal.id}
                        pipelineStageId={deal.pipelineStageId}
                        stages={selectedPipeline.stages}
                        className="h-7 w-full text-xs"
                      />
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

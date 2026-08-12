import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/field";
import { buttonClasses } from "@/components/ui/button";
import { DealStageSelect } from "@/components/deals/deal-stage-select";
import { DEAL_STAGES, DEAL_STAGE_LABELS } from "@/lib/labels";
import { formatCurrency, formatDate, fullName } from "@/lib/format";
import { getCurrency } from "@/lib/settings";
import type { Prisma } from "@/generated/prisma/client";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  const where: Prisma.DealWhereInput | undefined = query
    ? {
        OR: [
          { title: { contains: query } },
          { notes: { contains: query } },
          { company: { name: { contains: query } } },
          { contact: { firstName: { contains: query } } },
          { contact: { lastName: { contains: query } } },
        ],
      }
    : undefined;

  const [currency, deals] = await Promise.all([
    getCurrency(),
    db.deal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { company: true, contact: true },
    }),
  ]);

  const columns = DEAL_STAGES.map((stage) => {
    const stageDeals = deals.filter((deal) => deal.stage === stage);
    const total = stageDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
    return { stage, deals: stageDeals, total };
  });

  return (
    <div>
      <PageHeader
        title="Deals"
        description={`${deals.length} ${deals.length === 1 ? "deal" : "deals"} in the pipeline`}
        actions={
          <Link href="/deals/new" className={buttonClasses()}>
            <Plus className="h-4 w-4" />
            New deal
          </Link>
        }
      />

      <form className="mb-4">
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

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.stage} className="w-72 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {DEAL_STAGE_LABELS[column.stage]}
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
                  {query ? "No matches" : "No deals"}
                </p>
              ) : (
                column.deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <Link href={`/deals/${deal.id}`} className="block">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {deal.title}
                      </p>
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
                        stage={deal.stage}
                        className="h-7 w-full text-xs"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

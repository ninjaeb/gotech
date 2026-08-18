import Link from "next/link";
import { Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { getCurrency } from "@/lib/settings";
import { cn } from "@/lib/utils";

const PERIODS = [
  { key: "month", label: "This month" },
  { key: "quarter", label: "This quarter" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

function periodStart(period: PeriodKey): Date | null {
  const now = new Date();
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "quarter") return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return null;
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = PERIODS.some((p) => p.key === periodParam) ? (periodParam as PeriodKey) : "month";
  const since = periodStart(period);

  const [currency, users, wonDeals] = await Promise.all([
    getCurrency(),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.deal.findMany({
      where: {
        pipelineStage: { isWon: true },
        ownerId: { not: null },
        ...(since ? { wonAt: { gte: since } } : {}),
      },
      select: { value: true, ownerId: true },
    }),
  ]);

  const statsByOwner = new Map<string, { count: number; total: number }>();
  for (const deal of wonDeals) {
    if (!deal.ownerId) continue;
    const stats = statsByOwner.get(deal.ownerId) ?? { count: 0, total: 0 };
    stats.count += 1;
    stats.total += Number(deal.value);
    statsByOwner.set(deal.ownerId, stats);
  }

  const ranked = users
    .map((user) => ({ ...user, ...(statsByOwner.get(user.id) ?? { count: 0, total: 0 }) }))
    .sort((a, b) => b.total - a.total || b.count - a.count || a.name.localeCompare(b.name));

  return (
    <div className="max-w-2xl">
      <PageHeader title="Leaderboard" description="Deals won, ranked" />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/leaderboard?period=${p.key}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              p.key === period
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-700",
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardBody className="p-0">
          {ranked.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No logins yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {ranked.map((entry, index) => {
                const rank = index + 1;
                return (
                  <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        rank === 1
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                          : "bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-slate-400",
                      )}
                    >
                      {rank === 1 ? <Trophy className="h-3.5 w-3.5" /> : rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                        {entry.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {entry.count} {entry.count === 1 ? "deal" : "deals"} won
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {formatCurrency(entry.total, currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

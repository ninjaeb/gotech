import { Banknote, Handshake, Wallet } from "lucide-react";
import { requirePartner } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getPartnerStats } from "@/lib/referrals";
import { getCurrency } from "@/lib/settings";
import { formatCurrencyExact, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { CommissionStatusBadge, WithdrawalStatusBadge } from "@/components/referrals/referral-status-badge";
import { WithdrawalRequestForm } from "@/components/referrals/withdrawal-request-form";

export default async function PartnerCommissionsPage() {
  const user = await requirePartner();
  const [currency, stats, commissions, withdrawals] = await Promise.all([
    getCurrency(),
    getPartnerStats(user.id),
    db.referralCommission.findMany({
      where: { partnerId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, dealTitle: true, dealValue: true, rate: true, amount: true, status: true, createdAt: true },
    }),
    db.referralWithdrawal.findMany({
      where: { partnerId: user.id },
      orderBy: { requestedAt: "desc" },
      select: { id: true, amount: true, status: true, requestedAt: true, resolvedAt: true, adminNote: true },
    }),
  ]);
  const hasOpenRequest = withdrawals.some((withdrawal) => withdrawal.status === "REQUESTED");

  return (
    <div className="space-y-6">
      <PageHeader title="Commissions" description="What you've earned, what's available, and what's been paid out" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total earned"
          value={formatCurrencyExact(stats.earned, currency)}
          description={stats.pending > 0 ? `${formatCurrencyExact(stats.pending, currency)} awaiting approval` : "All commissions"}
          icon={Handshake}
          accent="emerald"
        />
        <StatCard
          label="Available to withdraw"
          value={formatCurrencyExact(stats.available, currency)}
          description={stats.requested > 0 ? `${formatCurrencyExact(stats.requested, currency)} already requested` : "Approved, not yet requested"}
          icon={Wallet}
          accent="orange"
        />
        <StatCard label="Paid out" value={formatCurrencyExact(stats.paid, currency)} icon={Banknote} accent="sky" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Withdraw</CardTitle>
        </CardHeader>
        <CardBody>
          {hasOpenRequest ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your withdrawal request is being processed — you&apos;ll see it marked as paid below once the
              money&apos;s been sent.
            </p>
          ) : stats.available > 0 ? (
            <WithdrawalRequestForm availableLabel={formatCurrencyExact(stats.available, currency)} />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nothing available to withdraw right now. A commission is earned when a deal you referred is won,
              and becomes available once our team approves it.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commission history</CardTitle>
        </CardHeader>
        <CardBody>
          {commissions.length === 0 ? (
            <EmptyState icon={Handshake} title="No commissions yet." description="Each deal won from one of your leads earns one." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-neutral-800 dark:text-slate-400">
                    <th className="py-2 pr-3 font-medium">Deal</th>
                    <th className="py-2 pr-3 font-medium">Won</th>
                    <th className="py-2 pr-3 font-medium">Deal value</th>
                    <th className="py-2 pr-3 font-medium">Rate</th>
                    <th className="py-2 pr-3 font-medium">Commission</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                  {commissions.map((commission) => (
                    <tr key={commission.id} className={commission.status === "VOID" ? "opacity-60" : undefined}>
                      <td className="py-2.5 pr-3 font-medium text-slate-800 dark:text-slate-200">{commission.dealTitle}</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {formatDate(commission.createdAt)}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {formatCurrencyExact(Number(commission.dealValue), currency)}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {Number(commission.rate)}%
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                        {formatCurrencyExact(Number(commission.amount), currency)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <CommissionStatusBadge status={commission.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawals</CardTitle>
        </CardHeader>
        <CardBody>
          {withdrawals.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No withdrawals requested yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {withdrawals.map((withdrawal) => (
                <li key={withdrawal.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {formatCurrencyExact(Number(withdrawal.amount), currency)}
                    </p>
                    <p className="text-xs text-slate-400">
                      Requested {formatDate(withdrawal.requestedAt)}
                      {withdrawal.resolvedAt && ` · ${withdrawal.status === "PAID" ? "Paid" : "Resolved"} ${formatDate(withdrawal.resolvedAt)}`}
                      {withdrawal.adminNote && ` · ${withdrawal.adminNote}`}
                    </p>
                  </div>
                  <WithdrawalStatusBadge status={withdrawal.status} />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

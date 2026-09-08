import Link from "next/link";
import { Banknote, Handshake, MousePointerClick, Settings, Trophy, UserPlus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getPartnerStats } from "@/lib/referrals";
import { getCurrency, getReferralSettings } from "@/lib/settings";
import { getSiteOrigin } from "@/lib/site-url";
import { formatCurrencyExact, formatDate, formatDateTime } from "@/lib/format";
import {
  approveReferralCommission,
  markReferralWithdrawalPaid,
  rejectReferralWithdrawal,
  voidReferralCommission,
} from "@/app/actions/referrals";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { PartnerRateEditor } from "@/components/referrals/partner-rate-editor";
import { WithdrawalStatusBadge } from "@/components/referrals/referral-status-badge";

export default async function ReferralsPage() {
  await requireAdmin();
  const [currency, settings, siteOrigin, partners, pendingCommissions, openWithdrawals, recentWithdrawals] =
    await Promise.all([
      getCurrency(),
      getReferralSettings(),
      getSiteOrigin(),
      db.user.findMany({
        where: { role: "PARTNER" },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, referralCode: true, referralCommissionRate: true },
      }),
      db.referralCommission.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          amount: true,
          rate: true,
          dealValue: true,
          dealTitle: true,
          dealId: true,
          createdAt: true,
          partner: { select: { name: true } },
        },
      }),
      db.referralWithdrawal.findMany({
        where: { status: "REQUESTED" },
        orderBy: { requestedAt: "asc" },
        select: {
          id: true,
          amount: true,
          paymentDetails: true,
          requestedAt: true,
          partner: { select: { name: true, email: true } },
          _count: { select: { commissions: true } },
        },
      }),
      db.referralWithdrawal.findMany({
        where: { status: { not: "REQUESTED" } },
        orderBy: { resolvedAt: "desc" },
        take: 10,
        select: {
          id: true,
          amount: true,
          status: true,
          resolvedAt: true,
          adminNote: true,
          partner: { select: { name: true } },
        },
      }),
    ]);

  const partnerRows = await Promise.all(
    partners.map(async (partner) => ({ ...partner, stats: await getPartnerStats(partner.id) })),
  );
  const totals = partnerRows.reduce(
    (sum, partner) => ({
      clicks: sum.clicks + partner.stats.clicks,
      leads: sum.leads + partner.stats.leads,
      won: sum.won + partner.stats.wonDeals,
      owed: sum.owed + partner.stats.available + partner.stats.requested,
      paid: sum.paid + partner.stats.paid,
    }),
    { clicks: 0, leads: 0, won: 0, owed: 0, paid: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referrals"
        description="Partners, the leads their links bring in, and the commissions owed on them"
        actions={
          <Link href="/settings/referrals" className={buttonClasses("secondary", "sm")}>
            <Settings className="h-4 w-4" />
            Program settings
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Partners" value={partners.length.toString()} icon={Handshake} accent="indigo" />
        <StatCard label="Link clicks" value={totals.clicks.toString()} icon={MousePointerClick} accent="sky" />
        <StatCard label="Referred leads" value={totals.leads.toString()} icon={UserPlus} accent="amber" />
        <StatCard label="Won" value={totals.won.toString()} icon={Trophy} accent="emerald" />
        <StatCard
          label="Commission owed"
          value={formatCurrencyExact(totals.owed, currency)}
          description={`${formatCurrencyExact(totals.paid, currency)} paid to date`}
          icon={Banknote}
          accent="orange"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal requests</CardTitle>
        </CardHeader>
        <CardBody>
          {openWithdrawals.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No withdrawal requests waiting.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {openWithdrawals.map((withdrawal) => (
                <li key={withdrawal.id} className="space-y-2 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {withdrawal.partner.name} · {formatCurrencyExact(Number(withdrawal.amount), currency)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {withdrawal._count.commissions} commission{withdrawal._count.commissions === 1 ? "" : "s"} ·
                        requested {formatDateTime(withdrawal.requestedAt)} · {withdrawal.partner.email}
                      </p>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-neutral-800 dark:text-slate-300">
                    {withdrawal.paymentDetails}
                  </p>
                  {/* One form, two submit buttons (formAction), so the note applies to whichever is clicked. */}
                  <form className="flex flex-wrap items-center gap-2">
                    <Input name="note" placeholder="Payment reference / reason (optional)" className="!h-8 max-w-xs text-xs" />
                    <Button type="submit" size="sm" formAction={markReferralWithdrawalPaid.bind(null, withdrawal.id)}>
                      Mark paid
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      variant="secondary"
                      formAction={rejectReferralWithdrawal.bind(null, withdrawal.id)}
                    >
                      Reject
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commissions awaiting approval</CardTitle>
        </CardHeader>
        <CardBody>
          {pendingCommissions.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nothing to approve. A commission appears here the moment a referred deal is marked won.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {pendingCommissions.map((commission) => (
                <li key={commission.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {commission.partner.name} · {formatCurrencyExact(Number(commission.amount), currency)}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {Number(commission.rate)}% of {formatCurrencyExact(Number(commission.dealValue), currency)} ·{" "}
                      {commission.dealId ? (
                        <Link href={`/deals/${commission.dealId}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                          {commission.dealTitle}
                        </Link>
                      ) : (
                        commission.dealTitle
                      )}{" "}
                      · won {formatDate(commission.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={approveReferralCommission.bind(null, commission.id)}>
                      <Button type="submit" size="sm">
                        Approve
                      </Button>
                    </form>
                    <form action={voidReferralCommission.bind(null, commission.id)}>
                      <ConfirmSubmitButton
                        confirmMessage={`Void this ${formatCurrencyExact(Number(commission.amount), currency)} commission for ${commission.partner.name}? It won't count toward their balance.`}
                        variant="secondary"
                      >
                        Void
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Partners</CardTitle>
        </CardHeader>
        <CardBody>
          {partnerRows.length === 0 ? (
            <EmptyState
              icon={Handshake}
              title="No partners yet."
              description="Add a login with the Partner role from Settings → Team — they get a referral link the moment they sign in."
              action={
                <Link href="/settings/team" className={buttonClasses("primary", "sm")}>
                  Go to Team
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-neutral-800 dark:text-slate-400">
                    <th className="py-2 pr-3 font-medium">Partner</th>
                    <th className="py-2 pr-3 font-medium">Link</th>
                    <th className="py-2 pr-3 font-medium">Clicks</th>
                    <th className="py-2 pr-3 font-medium">Leads</th>
                    <th className="py-2 pr-3 font-medium">Won</th>
                    <th className="py-2 pr-3 font-medium">Earned</th>
                    <th className="py-2 pr-3 font-medium">Owed</th>
                    <th className="py-2 pr-3 font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                  {partnerRows.map((partner) => (
                    <tr key={partner.id}>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{partner.name}</p>
                        <p className="text-xs text-slate-400">{partner.email}</p>
                      </td>
                      <td className="py-2.5 pr-3">
                        {partner.referralCode ? (
                          <div className="flex items-center gap-1.5">
                            <code className="font-mono text-xs text-slate-600 dark:text-slate-300">/r/{partner.referralCode}</code>
                            <CopyLinkButton text={`${siteOrigin}/r/${partner.referralCode}`} label="Copy" />
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Generated on first sign-in</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">{partner.stats.clicks}</td>
                      <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">{partner.stats.leads}</td>
                      <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">{partner.stats.wonDeals}</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {formatCurrencyExact(partner.stats.earned, currency)}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {formatCurrencyExact(partner.stats.available + partner.stats.requested, currency)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <PartnerRateEditor
                          userId={partner.id}
                          rate={partner.referralCommissionRate === null ? null : Number(partner.referralCommissionRate)}
                          defaultRate={settings.commissionRate}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {recentWithdrawals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent payouts</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {recentWithdrawals.map((withdrawal) => (
                <li key={withdrawal.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {withdrawal.partner.name} · {formatCurrencyExact(Number(withdrawal.amount), currency)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {withdrawal.resolvedAt && formatDate(withdrawal.resolvedAt)}
                      {withdrawal.adminNote && ` · ${withdrawal.adminNote}`}
                    </p>
                  </div>
                  <WithdrawalStatusBadge status={withdrawal.status} />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

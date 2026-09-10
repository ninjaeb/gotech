import Link from "next/link";
import { Handshake, Plus, Trophy, Wallet } from "lucide-react";
import { requireCompletePartnerProfile } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getCurrency } from "@/lib/settings";
import { formatCurrency, formatCurrencyExact } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { PARTNER_DEAL_STATUS_BADGE_CLASSES, PARTNER_DEAL_STATUS_LABELS } from "@/lib/labels";

export default async function PartnerDealsPage() {
  const user = await requireCompletePartnerProfile();
  const [currency, deals] = await Promise.all([
    getCurrency(),
    db.partnerDeal.findMany({
      where: { partnerId: user.id },
      orderBy: { createdAt: "desc" },
      include: { company: { select: { name: true } }, contact: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  const open = deals.filter((deal) => deal.status === "OPEN").length;
  const won = deals.filter((deal) => deal.status === "WON");
  const wonValue = won.reduce((sum, deal) => sum + Number(deal.value), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deals"
        description={`${deals.length} ${deals.length === 1 ? "deal" : "deals"}`}
        actions={
          <Link href="/business-portal/deals/new" className={buttonClasses()}>
            <Plus className="h-4 w-4" />
            New deal
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open" value={open.toString()} icon={Handshake} accent="sky" />
        <StatCard label="Won" value={won.length.toString()} icon={Trophy} accent="emerald" />
        <StatCard label="Won value" value={formatCurrencyExact(wonValue, currency)} icon={Wallet} accent="indigo" />
      </div>

      <Card>
        <CardBody>
          {deals.length === 0 ? (
            <EmptyState
              icon={Handshake}
              title="No deals yet."
              description="Track the opportunities you're working on with your companies and contacts."
              action={
                <Link href="/business-portal/deals/new" className={buttonClasses()}>
                  <Plus className="h-4 w-4" />
                  New deal
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-neutral-800 dark:text-slate-400">
                    <th className="py-2 pr-3 font-medium">Deal</th>
                    <th className="py-2 pr-3 font-medium">Company / contact</th>
                    <th className="py-2 pr-3 font-medium">Value</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                  {deals.map((deal) => (
                    <tr key={deal.id}>
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/business-portal/deals/${deal.id}`}
                          className="font-medium text-slate-800 hover:text-petrol dark:text-slate-200 dark:hover:text-petrol-light"
                        >
                          {deal.title}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {deal.company?.name ?? (deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName ?? ""}`.trim() : "—")}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {formatCurrency(deal.value.toString(), currency)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge className={PARTNER_DEAL_STATUS_BADGE_CLASSES[deal.status]}>{PARTNER_DEAL_STATUS_LABELS[deal.status]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

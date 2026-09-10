import { UserPlus } from "lucide-react";
import { requireCompletePartnerProfile } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { referredDealStatus } from "@/lib/referrals";
import { getCurrency } from "@/lib/settings";
import { formatCurrencyExact, formatDate, fullName } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CommissionStatusBadge, ReferredDealStatusBadge } from "@/components/referrals/referral-status-badge";

// Every lead this partner's link brought in, with where it stands. Shows
// the contact/company and the deal's outcome, but not the CRM's internal
// stage names, notes, or anyone else's leads — a partner is external.
export default async function PartnerLeadsPage() {
  const user = await requireCompletePartnerProfile();
  const [currency, deals] = await Promise.all([
    getCurrency(),
    db.deal.findMany({
      where: { referredById: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        wonAt: true,
        company: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true } },
        pipelineStage: { select: { isWon: true, isLost: true } },
        referralCommission: { select: { amount: true, status: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Leads" description="Everyone who sent an inquiry through your referral link" />
      <Card>
        <CardBody>
          {deals.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No leads yet."
              description="Share your referral link — inquiries sent through it are listed here as they come in."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-neutral-800 dark:text-slate-400">
                    <th className="py-2 pr-3 font-medium">Lead</th>
                    <th className="py-2 pr-3 font-medium">Received</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                  {deals.map((deal) => {
                    const status = referredDealStatus(deal.pipelineStage);
                    const contactName = deal.contact ? fullName(deal.contact.firstName, deal.contact.lastName) : null;
                    return (
                      <tr key={deal.id}>
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {deal.company?.name ?? contactName ?? "Lead"}
                          </p>
                          {deal.company?.name && contactName && <p className="text-xs text-slate-400">{contactName}</p>}
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {formatDate(deal.createdAt)}
                        </td>
                        <td className="py-2.5 pr-3">
                          <ReferredDealStatusBadge status={status} />
                          {status === "WON" && deal.wonAt && (
                            <p className="mt-0.5 text-xs text-slate-400">on {formatDate(deal.wonAt)}</p>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          {deal.referralCommission ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {formatCurrencyExact(Number(deal.referralCommission.amount), currency)}
                              </span>
                              <CommissionStatusBadge status={deal.referralCommission.status} />
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {status === "LOST" ? "—" : "Earned when the deal is won"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

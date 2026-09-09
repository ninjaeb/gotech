import Link from "next/link";
import { Banknote, Handshake, Inbox, MousePointerClick, Store, Trophy, UserPlus, Wallet } from "lucide-react";
import { requirePartner } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { generateReferralCode, getPartnerStats, referredDealStatus } from "@/lib/referrals";
import { ensurePartnerListing, getDirectoryLeadStats } from "@/lib/directory";
import { getCurrency, getReferralSettings } from "@/lib/settings";
import { getSiteOrigin } from "@/lib/site-url";
import { formatCurrencyExact, formatDate, fullName } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/field";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ReferredDealStatusBadge } from "@/components/referrals/referral-status-badge";
import { PARTNER_LISTING_STATUS_BADGE_CLASSES, PARTNER_LISTING_STATUS_LABELS } from "@/lib/labels";

// A partner account normally gets its code the moment it's created (or its
// role is switched) — see src/app/actions/users.ts — but an account that
// somehow predates that still needs one the first time it lands here.
async function ensureReferralCode(userId: string, name: string): Promise<string> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { referralCode: true } });
  if (user.referralCode) return user.referralCode;
  const code = await generateReferralCode(name);
  await db.user.update({ where: { id: userId }, data: { referralCode: code } });
  return code;
}

export default async function PartnerOverviewPage() {
  const user = await requirePartner();
  const [code, stats, currency, settings, siteOrigin, recentLeads, listing] = await Promise.all([
    ensureReferralCode(user.id, user.name),
    getPartnerStats(user.id),
    getCurrency(),
    getReferralSettings(),
    getSiteOrigin(),
    db.deal.findMany({
      where: { referredById: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        company: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true } },
        pipelineStage: { select: { isWon: true, isLost: true } },
      },
    }),
    ensurePartnerListing(user.id, user.name),
  ]);
  const directoryStats = await getDirectoryLeadStats(listing.id);

  const referralLink = `${siteOrigin}/r/${code}`;
  const partnerRate = await db.user
    .findUniqueOrThrow({ where: { id: user.id }, select: { referralCommissionRate: true } })
    .then((row) => (row.referralCommissionRate === null ? settings.commissionRate : Number(row.referralCommissionRate)));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description={`You earn ${partnerRate}% of every deal won from a lead you refer.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Your referral link</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Share this anywhere — a message, your website, social media. Anyone who opens it lands on our
            signup page, and any inquiry they send is credited to you.
          </p>
          <div>
            <Label htmlFor="referral-link">Link</Label>
            <div className="flex items-center gap-2">
              <Input id="referral-link" readOnly value={referralLink} className="font-mono text-xs" />
              <CopyLinkButton text={referralLink} />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Link clicks"
          value={stats.clicks.toString()}
          description={`${stats.clicksLast30Days} in the last 30 days`}
          icon={MousePointerClick}
          accent="sky"
        />
        <StatCard
          label="Leads referred"
          value={stats.leads.toString()}
          description="Inquiries sent through your link"
          icon={UserPlus}
          accent="indigo"
          href="/partner/leads"
        />
        <StatCard
          label="Deals won"
          value={stats.wonDeals.toString()}
          description="Referred leads that became customers"
          icon={Trophy}
          accent="amber"
        />
        <StatCard
          label="Total earned"
          value={formatCurrencyExact(stats.earned, currency)}
          description="All commissions, before payouts"
          icon={Handshake}
          accent="emerald"
          href="/partner/commissions"
        />
        <StatCard
          label="Available to withdraw"
          value={formatCurrencyExact(stats.available, currency)}
          description={stats.pending > 0 ? `${formatCurrencyExact(stats.pending, currency)} awaiting approval` : "Approved, not yet requested"}
          icon={Wallet}
          accent="orange"
          href="/partner/commissions"
        />
        <StatCard
          label="Paid out"
          value={formatCurrencyExact(stats.paid, currency)}
          description={stats.requested > 0 ? `${formatCurrencyExact(stats.requested, currency)} requested, pending payment` : "Received so far"}
          icon={Banknote}
          accent="rose"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent leads</CardTitle>
        </CardHeader>
        <CardBody>
          {recentLeads.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No leads yet."
              description="Once someone sends an inquiry through your link, it shows up here with its progress."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {recentLeads.map((deal) => (
                <li key={deal.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800 dark:text-slate-200">
                      {deal.company?.name ??
                        (deal.contact ? fullName(deal.contact.firstName, deal.contact.lastName) : "Lead")}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(deal.createdAt)}</p>
                  </div>
                  <ReferredDealStatusBadge status={referredDealStatus(deal.pipelineStage)} />
                </li>
              ))}
            </ul>
          )}
          {stats.leads > recentLeads.length && (
            <p className="mt-3 text-right text-xs">
              <Link href="/partner/leads" className="text-petrol hover:underline dark:text-petrol-light">
                See all {stats.leads} leads
              </Link>
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Directory listing</CardTitle>
          <Link href="/partner/listing" className="text-sm font-medium text-petrol hover:underline dark:text-petrol-light">
            Edit listing
          </Link>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={PARTNER_LISTING_STATUS_BADGE_CLASSES[listing.status]}>
              {PARTNER_LISTING_STATUS_LABELS[listing.status]}
            </Badge>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {listing.publishedSnapshot ? "Live on the partner directory" : "Not published yet"}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="New leads"
              value={directoryStats.new.toString()}
              icon={Inbox}
              accent="sky"
              href="/partner/directory-leads"
            />
            <StatCard label="Won" value={directoryStats.won.toString()} icon={Store} accent="emerald" />
            <StatCard
              label="Won value"
              value={formatCurrencyExact(directoryStats.wonValue, currency)}
              icon={Wallet}
              accent="indigo"
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

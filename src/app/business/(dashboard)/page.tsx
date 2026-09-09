import Link from "next/link";
import { Banknote, Handshake, Inbox, MousePointerClick, Store, ThumbsUp, Trophy, UserPlus, Wallet } from "lucide-react";
import { requirePartner } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { generateReferralCode, getPartnerStats, getRecommendationBreakdown, referredDealStatus } from "@/lib/referrals";
import { getDirectoryLeadStatsForPartner, listPartnerListings } from "@/lib/directory";
import { DEFAULT_DIRECTORY_LOCALE, directoryHomePath, directoryListingPath } from "@/lib/directory-i18n";
import { DIRECTORY_LEAD_STATUS_BADGE_CLASSES, DIRECTORY_LEAD_STATUS_LABELS } from "@/lib/labels";
import { getCurrency, getReferralSettings } from "@/lib/settings";
import { getSiteOrigin } from "@/lib/site-url";
import { formatCurrencyExact, formatDate, fullName } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ReferredDealStatusBadge } from "@/components/referrals/referral-status-badge";

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
  const [code, stats, currency, settings, siteOrigin, recommendations, recentLeads, listings] = await Promise.all([
    ensureReferralCode(user.id, user.name),
    getPartnerStats(user.id),
    getCurrency(),
    getReferralSettings(),
    getSiteOrigin(),
    getRecommendationBreakdown(user.id),
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
    listPartnerListings(user.id),
  ]);
  const directoryStats = await getDirectoryLeadStatsForPartner(user.id);
  const publishedListingCount = listings.filter((listing) => listing.publishedSnapshot).length;

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
          href="/business/leads"
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
          href="/business/commissions"
        />
        <StatCard
          label="Available to withdraw"
          value={formatCurrencyExact(stats.available, currency)}
          description={stats.pending > 0 ? `${formatCurrencyExact(stats.pending, currency)} awaiting approval` : "Approved, not yet requested"}
          icon={Wallet}
          accent="orange"
          href="/business/commissions"
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
              <Link href="/business/leads" className="text-petrol hover:underline dark:text-petrol-light">
                See all {stats.leads} leads
              </Link>
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your recommendations</CardTitle>
          <Link
            href={directoryHomePath(DEFAULT_DIRECTORY_LOCALE)}
            className="text-sm font-medium text-petrol hover:underline dark:text-petrol-light"
          >
            Browse the directory
          </Link>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Open any business on the directory and tap <span className="font-medium">Recommend</span> to share it
            with your own link. Every click and inquiry that comes through it is tracked here.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Recommendation clicks"
              value={stats.recommendationClicks.toString()}
              icon={MousePointerClick}
              accent="sky"
            />
            <StatCard
              label="Leads from recommendations"
              value={stats.recommendedLeads.toString()}
              description="Inquiries sent via your links"
              icon={ThumbsUp}
              accent="indigo"
            />
            <StatCard
              label="Won"
              value={stats.recommendedLeadsWon.toString()}
              description="Marked won by the business"
              icon={Trophy}
              accent="emerald"
            />
          </div>
          {recommendations.length === 0 ? (
            <EmptyState
              icon={ThumbsUp}
              title="No recommendations yet."
              description="Businesses you recommend show up here with their clicks, inquiries, and how each one is going."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {recommendations.map((row) => (
                <li key={row.listingId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link
                      href={directoryListingPath(DEFAULT_DIRECTORY_LOCALE, row.slug)}
                      className="truncate font-medium text-slate-800 hover:text-petrol dark:text-slate-200 dark:hover:text-petrol-light"
                    >
                      {row.companyName}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {row.clicks} click{row.clicks === 1 ? "" : "s"} · {row.leads} inquir{row.leads === 1 ? "y" : "ies"}
                      {" · "}
                      {formatDate(row.lastActivityAt)}
                    </p>
                  </div>
                  {row.latestLeadStatus ? (
                    <Badge className={DIRECTORY_LEAD_STATUS_BADGE_CLASSES[row.latestLeadStatus]}>
                      {DIRECTORY_LEAD_STATUS_LABELS[row.latestLeadStatus]}
                    </Badge>
                  ) : (
                    <Badge>No inquiries yet</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Directory listings</CardTitle>
          <Link href="/business/listings" className="text-sm font-medium text-petrol hover:underline dark:text-petrol-light">
            Manage listings
          </Link>
        </CardHeader>
        <CardBody className="space-y-4">
          {listings.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You haven&apos;t created a listing yet —{" "}
              <Link href="/business/listings" className="text-petrol hover:underline dark:text-petrol-light">
                create one
              </Link>{" "}
              to get on the public directory.
            </p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {listings.length} listing{listings.length === 1 ? "" : "s"}
              {publishedListingCount > 0 &&
                ` · ${publishedListingCount} live on the partner directory`}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="New leads"
              value={directoryStats.new.toString()}
              icon={Inbox}
              accent="sky"
              href="/business/directory-leads"
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

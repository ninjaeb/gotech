import Link from "next/link";
import { Banknote, Handshake, Inbox, Store } from "lucide-react";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getDirectoryOverviewStats, groupOperatingHours, operatingHoursFromJson, servicesFromJson } from "@/lib/directory";
import { DEFAULT_DIRECTORY_LOCALE, DIRECTORY_STRINGS, directoryHomePath, directoryListingPath } from "@/lib/directory-i18n";
import { getCurrency, getDirectoryApprovalMode } from "@/lib/settings";
import { formatCurrencyExact, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { ListingLogo } from "@/components/directory/listing-logo";
import { DirectoryApprovalSettingsForm } from "@/components/directory/directory-approval-settings-form";
import {
  approveDirectoryListing,
  rejectDirectoryListing,
  transferDirectoryListing,
  unpublishDirectoryListing,
} from "@/app/actions/directory";
import { deleteBusinessCategory } from "@/app/actions/business-categories";
import {
  DIRECTORY_LEAD_STATUS_BADGE_CLASSES,
  DIRECTORY_LEAD_STATUS_LABELS,
  INDUSTRY_LABELS,
  PARTNER_LISTING_STATUS_BADGE_CLASSES,
  PARTNER_LISTING_STATUS_LABELS,
} from "@/lib/labels";

// Admin-only preview, so English day names/labels are fine unconditionally
// — this page isn't trilingual like the public directory itself.
function formatOperatingHoursPreview(value: unknown): string[] {
  const hours = operatingHoursFromJson(value);
  if (!hours) return [];
  const t = DIRECTORY_STRINGS.en;
  return groupOperatingHours(hours).map((group) => {
    const first = t.dayLabels[group.days[0]];
    const last = t.dayLabels[group.days[group.days.length - 1]];
    const dayRange = group.days.length > 1 ? `${first}–${last}` : first;
    const hoursText = group.hours ? `${group.hours.open}–${group.hours.close}` : t.hoursClosedLabel;
    return `${dayRange}: ${hoursText}`;
  });
}

export default async function DirectorySettingsPage() {
  await requireAdmin();
  const [stats, currency, approvalMode, pendingListings, allListings, partners, businessCategories, recentLeads] = await Promise.all([
    getDirectoryOverviewStats(),
    getCurrency(),
    getDirectoryApprovalMode(),
    db.partnerListing.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { submittedAt: "asc" },
      include: { partner: { select: { name: true, email: true } } },
    }),
    db.partnerListing.findMany({
      orderBy: { updatedAt: "desc" },
      include: { partner: { select: { name: true } }, _count: { select: { leads: true } } },
    }),
    // For the "Transfer" picker on each listing row below — every partner
    // account a listing could be reassigned to.
    db.user.findMany({
      where: { role: "PARTNER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    db.businessCategory.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { listings: true } } },
    }),
    db.directoryLead.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { listing: { select: { companyName: true, slug: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Settings", href: "/system/settings" }, { label: "Directory" }]}
        title="Partner directory"
        description="Review partner listings and see how their inquiries are going"
        actions={
          <Link href={directoryHomePath(DEFAULT_DIRECTORY_LOCALE)} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            View public directory
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Published listings" value={stats.publishedListings.toString()} icon={Store} accent="emerald" />
        <StatCard label="Pending review" value={stats.pendingListings.toString()} icon={Inbox} accent="amber" />
        <StatCard
          label="Leads"
          value={stats.totalLeads.toString()}
          description={`${stats.leadsLast30Days} in the last 30 days`}
          icon={Handshake}
          accent="sky"
        />
        <StatCard label="Won value" value={formatCurrencyExact(stats.wonValue, currency)} icon={Banknote} accent="indigo" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listing approval</CardTitle>
        </CardHeader>
        <CardBody>
          <DirectoryApprovalSettingsForm mode={approvalMode} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending review</CardTitle>
        </CardHeader>
        <CardBody>
          {pendingListings.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Nothing waiting on review.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {pendingListings.map((listing) => (
                <li key={listing.id} className="space-y-3 py-4 text-sm">
                  <div className="flex flex-wrap items-start gap-3">
                    <ListingLogo name={listing.companyName} logoUrl={listing.logoUrl} className="h-10 w-10 text-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{listing.companyName}</p>
                      <p className="text-xs text-slate-400">
                        {listing.partner.name} · {listing.partner.email} · submitted{" "}
                        {listing.submittedAt ? formatDate(listing.submittedAt) : "—"}
                      </p>
                      {listing.tagline && <p className="mt-1 text-slate-600 dark:text-slate-300">{listing.tagline}</p>}
                    </div>
                  </div>
                  {listing.description && (
                    <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs text-slate-600 dark:bg-neutral-800 dark:text-slate-300">
                      {listing.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {listing.industry && <span>{INDUSTRY_LABELS[listing.industry]}</span>}
                    {listing.website && <span>{listing.website}</span>}
                  </div>
                  {listing.address && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{listing.address}</p>
                  )}
                  {formatOperatingHoursPreview(listing.operatingHours).map((line) => (
                    <p key={line} className="text-xs text-slate-500 dark:text-slate-400">
                      {line}
                    </p>
                  ))}
                  {servicesFromJson(listing.services).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {servicesFromJson(listing.services).map((service, index) => (
                        <Badge key={index}>{service.price ? `${service.title} (${service.price})` : service.title}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={approveDirectoryListing.bind(null, listing.id)}>
                      <Button type="submit" size="sm">
                        Approve
                      </Button>
                    </form>
                    <form action={rejectDirectoryListing.bind(null, listing.id)} className="flex items-center gap-2">
                      <Input name="note" required placeholder="What needs to change?" className="!h-8 w-56 text-xs" />
                      <Button type="submit" size="sm" variant="secondary">
                        Reject
                      </Button>
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
          <CardTitle>All listings</CardTitle>
        </CardHeader>
        <CardBody>
          {allListings.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No partners yet. Add one from{" "}
              <Link href="/system/settings/team" className="text-indigo-600 hover:underline dark:text-indigo-400">
                Settings → Team
              </Link>{" "}
              with the Partner role.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-neutral-800 dark:text-slate-400">
                    <th className="py-2 pr-3 font-medium">Partner</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Leads</th>
                    <th className="py-2 pr-3 font-medium">Transfer to</th>
                    <th className="py-2 pr-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                  {allListings.map((listing) => {
                    const otherPartners = partners.filter((partner) => partner.id !== listing.partnerId);
                    return (
                    <tr key={listing.id}>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{listing.companyName}</p>
                        <p className="text-xs text-slate-400">{listing.partner.name}</p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge className={PARTNER_LISTING_STATUS_BADGE_CLASSES[listing.status]}>
                          {PARTNER_LISTING_STATUS_LABELS[listing.status]}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">{listing._count.leads}</td>
                      <td className="py-2.5 pr-3">
                        {otherPartners.length > 0 ? (
                          <form
                            action={transferDirectoryListing.bind(null, listing.id)}
                            className="flex items-center gap-1.5"
                          >
                            <Select name="newPartnerId" required defaultValue="" className="!h-8 w-44 text-xs">
                              <option value="" disabled>
                                Choose partner…
                              </option>
                              {otherPartners.map((partner) => (
                                <option key={partner.id} value={partner.id}>
                                  {partner.name} — {partner.email}
                                </option>
                              ))}
                            </Select>
                            <ConfirmSubmitButton
                              confirmMessage={`Transfer "${listing.companyName}" to a different partner account? That account will immediately see and manage it instead of ${listing.partner.name}.`}
                              variant="secondary"
                              size="sm"
                              className="!h-8 shrink-0 text-xs"
                            >
                              Transfer
                            </ConfirmSubmitButton>
                          </form>
                        ) : (
                          <span className="text-xs text-slate-400">No other partners yet</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <div className="flex justify-end gap-2">
                          {listing.publishedSnapshot && (
                            <Link
                              href={directoryListingPath(DEFAULT_DIRECTORY_LOCALE, listing.slug)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                            >
                              View live
                            </Link>
                          )}
                          {listing.publishedSnapshot && (
                            <form action={unpublishDirectoryListing.bind(null, listing.id)}>
                              <ConfirmSubmitButton
                                confirmMessage={`Take ${listing.companyName}'s listing off the public directory? They can resubmit it for review.`}
                                variant="ghost"
                                size="sm"
                                className="!h-auto !p-0 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400"
                              >
                                Unpublish
                              </ConfirmSubmitButton>
                            </form>
                          )}
                        </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Business categories</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {businessCategories.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No categories yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {businessCategories.map((category) => (
                <li key={category.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="text-slate-700 dark:text-slate-300">
                    {category.name}
                    <span className="ml-2 text-xs text-slate-400">
                      {category._count.listings} {category._count.listings === 1 ? "listing" : "listings"}
                    </span>
                  </span>
                  <form action={deleteBusinessCategory.bind(null, category.id)}>
                    <ConfirmSubmitButton
                      confirmMessage={`Delete "${category.name}"? Listings using it will lose that selection.`}
                      variant="ghost"
                      size="sm"
                      className="!h-auto !p-0 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {recentLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent leads</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {recentLeads.map((lead) => (
                <li key={lead.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800 dark:text-slate-200">
                      {lead.name}
                      {lead.company && ` · ${lead.company}`}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      to {lead.listing.companyName} · {formatDate(lead.createdAt)}
                    </p>
                  </div>
                  <Badge className={DIRECTORY_LEAD_STATUS_BADGE_CLASSES[lead.status]}>
                    {DIRECTORY_LEAD_STATUS_LABELS[lead.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

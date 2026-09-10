import Link from "next/link";
import { ExternalLink, Plus, Store } from "lucide-react";
import { createListingAction } from "@/app/actions/directory";
import { listPartnerListings } from "@/lib/directory";
import { requireCompletePartnerProfile } from "@/lib/auth/dal";
import { getSiteOrigin } from "@/lib/site-url";
import { directoryListingPath } from "@/lib/directory-i18n";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListingLogo } from "@/components/directory/listing-logo";
import { PARTNER_LISTING_STATUS_BADGE_CLASSES, PARTNER_LISTING_STATUS_LABELS } from "@/lib/labels";

// A partner account can list more than one business — each card here is
// its own PartnerListing row, independently drafted, submitted, and
// reviewed. "+ New listing" creates a blank draft and drops straight into
// its editor (see createListingAction); there's no separate "new listing"
// form to fill in first, same as the very first listing a partner ever
// gets started with.
export default async function PartnerListingsPage() {
  const user = await requireCompletePartnerProfile();
  const [listings, siteOrigin] = await Promise.all([listPartnerListings(user.id), getSiteOrigin()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My listings"
        description="Every business you have on the partner directory."
        actions={
          <form action={createListingAction}>
            <Button type="submit">
              <Plus className="h-4 w-4" />
              New listing
            </Button>
          </form>
        }
      />

      {listings.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={Store}
              title="No listings yet"
              description="Create your first listing to get your business on the public directory."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => {
            const publicUrl = listing.publishedSnapshot ? `${siteOrigin}${directoryListingPath("en", listing.slug)}` : null;
            return (
              <Card key={listing.id}>
                <CardBody className="space-y-3">
                  <div className="flex items-start gap-3">
                    <ListingLogo name={listing.companyName} logoUrl={listing.logoUrl} className="h-10 w-10 shrink-0 text-sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800 dark:text-slate-200">{listing.companyName}</p>
                      <Badge className={PARTNER_LISTING_STATUS_BADGE_CLASSES[listing.status]}>
                        {PARTNER_LISTING_STATUS_LABELS[listing.status]}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <Link
                      href={`/business-portal/listings/${listing.id}`}
                      className={buttonClasses("secondary", "sm")}
                    >
                      Edit
                    </Link>
                    {publicUrl && (
                      <Link
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-petrol hover:underline dark:text-petrol-light"
                      >
                        View public listing
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requirePartner } from "@/lib/auth/dal";
import { ensurePartnerListing, operatingHoursFromJson, servicesFromJson } from "@/lib/directory";
import { getSiteOrigin } from "@/lib/site-url";
import { isAiConfigured } from "@/lib/ai/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PartnerListingForm } from "@/components/directory/partner-listing-form";
import { PartnerSlugForm } from "@/components/directory/partner-slug-form";
import { PARTNER_LISTING_STATUS_BADGE_CLASSES, PARTNER_LISTING_STATUS_LABELS } from "@/lib/labels";

export default async function PartnerListingPage() {
  const user = await requirePartner();
  const [listing, siteOrigin] = await Promise.all([
    ensurePartnerListing(user.id, user.name),
    getSiteOrigin(),
  ]);

  const publicUrl = listing.publishedSnapshot ? `${siteOrigin}/directory/${listing.slug}` : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My listing"
        description="What visitors see on the Gotka partner directory, and the form they use to reach you."
      />

      <Card>
        <CardBody className="flex flex-wrap items-center gap-3">
          <Badge className={PARTNER_LISTING_STATUS_BADGE_CLASSES[listing.status]}>
            {PARTNER_LISTING_STATUS_LABELS[listing.status]}
          </Badge>
          {listing.status === "REJECTED" && listing.reviewNote && (
            <p className="w-full text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-800 dark:text-slate-200">Admin feedback: </span>
              {listing.reviewNote}
            </p>
          )}
          {publicUrl ? (
            <Link
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline dark:text-indigo-400"
            >
              View public listing
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Not live yet — save your details below and submit for review.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public URL</CardTitle>
        </CardHeader>
        <CardBody>
          <PartnerSlugForm slug={listing.slug} siteOrigin={siteOrigin} />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <PartnerListingForm
            status={listing.status}
            logoUrl={listing.logoUrl}
            operatingHours={operatingHoursFromJson(listing.operatingHours)}
            aiAvailable={isAiConfigured()}
            values={{
              companyName: listing.companyName,
              tagline: listing.tagline ?? "",
              description: listing.description ?? "",
              services: servicesFromJson(listing.services).join("\n"),
              industry: listing.industry ?? "",
              website: listing.website ?? "",
              location: listing.location ?? "",
              address: listing.address ?? "",
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}

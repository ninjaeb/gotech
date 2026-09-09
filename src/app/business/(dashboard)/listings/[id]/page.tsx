import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { requirePartner } from "@/lib/auth/dal";
import { faqsFromJson, getOwnedListing, operatingHoursFromJson, servicesFromJson, translationsFromJson } from "@/lib/directory";
import { getSiteOrigin } from "@/lib/site-url";
import { directoryListingPath } from "@/lib/directory-i18n";
import { isAiConfigured } from "@/lib/ai/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PartnerListingForm } from "@/components/directory/partner-listing-form";
import { PartnerSlugForm } from "@/components/directory/partner-slug-form";
import { PARTNER_LISTING_STATUS_BADGE_CLASSES, PARTNER_LISTING_STATUS_LABELS } from "@/lib/labels";

export default async function PartnerListingEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePartner();
  const { id } = await params;
  const listing = await getOwnedListing(id, user.id);
  if (!listing) notFound();

  const [siteOrigin, categories, selectedCategories] = await Promise.all([
    getSiteOrigin(),
    db.businessCategory.findMany({ orderBy: { name: "asc" } }),
    db.partnerListingCategory.findMany({ where: { listingId: listing.id }, select: { categoryId: true } }),
  ]);
  const selectedCategoryIds = selectedCategories.map((entry) => entry.categoryId);

  const publicUrl = listing.publishedSnapshot ? `${siteOrigin}${directoryListingPath("en", listing.slug)}` : null;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "My listings", href: "/business/listings" }, { label: listing.companyName }]}
        title={listing.companyName}
        description="What visitors see on the business directory, and the form they use to reach you."
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
              className="inline-flex items-center gap-1 text-sm text-petrol hover:underline dark:text-petrol-light"
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
          <PartnerSlugForm listingId={listing.id} slug={listing.slug} siteOrigin={siteOrigin} />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <PartnerListingForm
            listingId={listing.id}
            status={listing.status}
            logoUrl={listing.logoUrl}
            operatingHours={operatingHoursFromJson(listing.operatingHours)}
            aiAvailable={isAiConfigured()}
            categories={categories}
            values={{
              companyName: listing.companyName,
              tagline: listing.tagline ?? "",
              description: listing.description ?? "",
              services: servicesFromJson(listing.services),
              industry: listing.industry ?? "",
              website: listing.website ?? "",
              address: listing.address ?? "",
              faqs: faqsFromJson(listing.faqs),
              categoryIds: selectedCategoryIds,
              translations: translationsFromJson(listing.translations),
              seoTitle: listing.seoTitle ?? "",
              seoDescription: listing.seoDescription ?? "",
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}

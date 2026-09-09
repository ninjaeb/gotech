import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Globe, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { readPublishedSnapshot } from "@/lib/directory";
import { getDirectoryLocale } from "@/lib/directory-locale";
import { DIRECTORY_STRINGS } from "@/lib/directory-i18n";
import { INDUSTRY_LABELS } from "@/lib/labels";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListingLogo } from "@/components/directory/listing-logo";
import { DirectoryLeadForm } from "@/components/directory/directory-lead-form";

export const dynamic = "force-dynamic";

async function getPublishedListing(slug: string) {
  const listing = await db.partnerListing.findUnique({ where: { slug } });
  if (!listing) return null;
  return readPublishedSnapshot(listing.publishedSnapshot);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPublishedListing(slug);
  if (!listing) return {};
  return {
    title: `${listing.companyName} | Gotka Partner Directory`,
    description: listing.tagline ?? listing.description?.slice(0, 160) ?? undefined,
  };
}

export default async function DirectoryListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Reads the approved snapshot only — never the partner's live-editing
  // draft — same invariant the listing grid enforces (see
  // src/lib/directory.ts's PublishedListingSnapshot comment). A slug with
  // no snapshot at all (never approved, or since unpublished) 404s exactly
  // like one that doesn't exist.
  const listing = await getPublishedListing(slug);
  if (!listing) notFound();

  const locale = await getDirectoryLocale();
  const t = DIRECTORY_STRINGS[locale];

  return (
    <div className="w-full px-4 py-10 sm:px-8">
      <div className="mb-8 flex flex-wrap items-start gap-4">
        <ListingLogo name={listing.companyName} logoUrl={listing.logoUrl} className="h-16 w-16 text-xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{listing.companyName}</h1>
          {listing.tagline && <p className="mt-1 text-slate-600 dark:text-slate-300">{listing.tagline}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            {listing.industry && <Badge>{INDUSTRY_LABELS[listing.industry]}</Badge>}
            {listing.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {listing.location}
              </span>
            )}
            {listing.website && (
              <a
                href={listing.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400"
              >
                <Globe className="h-3.5 w-3.5" />
                {t.websiteLabel}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {listing.description && (
            <Card>
              <CardHeader>
                <CardTitle>{t.aboutHeading}</CardTitle>
              </CardHeader>
              <CardBody className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                {listing.description}
              </CardBody>
            </Card>
          )}
          {listing.services.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t.servicesHeading}</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-wrap gap-2">
                {listing.services.map((service) => (
                  <Badge key={service}>{service}</Badge>
                ))}
              </CardBody>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t.contactHeading}</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{t.contactSubheading}</p>
              <DirectoryLeadForm slug={slug} locale={locale} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

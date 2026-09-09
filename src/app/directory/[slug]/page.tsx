import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Clock, Globe, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { readPublishedSnapshot } from "@/lib/directory";
import { getDirectoryLocale } from "@/lib/directory-locale";
import { DIRECTORY_STRINGS } from "@/lib/directory-i18n";
import { getSiteOrigin } from "@/lib/site-url";
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

  const siteOrigin = await getSiteOrigin();
  const url = `${siteOrigin}/directory/${slug}`;
  const description =
    listing.tagline ?? listing.description?.slice(0, 160) ?? `${listing.companyName} on the Gotka partner directory.`;
  const title = `${listing.companyName} | Gotka Partner Directory`;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: "Gotka Partner Directory",
      type: "website",
      images: [{ url: `${siteOrigin}/icon-192.png` }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [`${siteOrigin}/icon-192.png`],
    },
  };
}

// Schema.org LocalBusiness markup — read by both search engines (SEO) and
// AI answer engines that crawl the page (GEO). Deliberately never includes
// a phone number: this is public, crawlable content, and the partner's own
// contact details stay internal (see PublishedListingSnapshot's own
// comment in src/lib/directory.ts) — a visitor reaches a partner only
// through the lead form below, never directly.
function buildJsonLd(listing: NonNullable<Awaited<ReturnType<typeof getPublishedListing>>>, url: string) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: listing.companyName,
    url,
  };
  const description = listing.description || listing.tagline;
  if (description) jsonLd.description = description;
  if (listing.logoUrl && /^https?:\/\//.test(listing.logoUrl)) jsonLd.image = listing.logoUrl;
  if (listing.address || listing.location) jsonLd.address = listing.address || listing.location;
  if (listing.website) jsonLd.sameAs = [listing.website];
  if (listing.industry) jsonLd.additionalType = INDUSTRY_LABELS[listing.industry];
  if (listing.services.length > 0) {
    jsonLd.makesOffer = listing.services.map((service) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: service },
    }));
  }
  // JSON.stringify doesn't escape "</script>" — without this, a company
  // name or description containing that literal string could break out of
  // the script tag. < is invisible to JSON parsing but not to an HTML
  // tokenizer, so this neutralizes it either way.
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
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

  const [locale, siteOrigin] = await Promise.all([getDirectoryLocale(), getSiteOrigin()]);
  const t = DIRECTORY_STRINGS[locale];
  const mapAddress = listing.address || listing.location;

  return (
    <div className="w-full px-4 py-10 sm:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildJsonLd(listing, `${siteOrigin}/directory/${slug}`) }}
      />
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
          {(mapAddress || listing.operatingHours) && (
            <Card>
              <CardHeader>
                <CardTitle>{t.visitHeading}</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                {listing.address && (
                  <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span className="whitespace-pre-wrap">{listing.address}</span>
                  </p>
                )}
                {listing.operatingHours && (
                  <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span className="whitespace-pre-wrap">{listing.operatingHours}</span>
                  </p>
                )}
                {mapAddress && (
                  <iframe
                    title={`${listing.companyName} on the map`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(mapAddress.replace(/\n/g, ", "))}&output=embed`}
                    className="h-64 w-full rounded-md border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                )}
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

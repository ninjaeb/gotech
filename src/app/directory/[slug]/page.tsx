import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Clock, Globe, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { formatOpeningHoursSchema, groupOperatingHours, readPublishedSnapshot, type OperatingHours } from "@/lib/directory";
import { renderMarkdownLite, stripMarkdownLiteToPlainText } from "@/lib/markdown-lite";
import { getDirectoryLocale } from "@/lib/directory-locale";
import { DIRECTORY_STRINGS, type DirectoryStrings } from "@/lib/directory-i18n";
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
  // Meta/OG/Twitter descriptions are plain-text summaries — strip the
  // About field's own markdown-lite syntax first so a search result or
  // link preview never shows literal "**"/"[]()" characters.
  const plainDescription = stripMarkdownLiteToPlainText(listing.description);
  const description =
    listing.tagline ?? (plainDescription ? plainDescription.slice(0, 160) : undefined) ?? `${listing.companyName} on the Gotka partner directory.`;
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
  const description = stripMarkdownLiteToPlainText(listing.description) || listing.tagline;
  if (description) jsonLd.description = description;
  if (listing.logoUrl && /^https?:\/\//.test(listing.logoUrl)) jsonLd.image = listing.logoUrl;
  if (listing.address || listing.location) jsonLd.address = listing.address || listing.location;
  if (listing.website) jsonLd.sameAs = [listing.website];
  if (listing.industry) jsonLd.additionalType = INDUSTRY_LABELS[listing.industry];
  if (listing.operatingHours) {
    const openingHours = formatOpeningHoursSchema(listing.operatingHours);
    if (openingHours.length > 0) jsonLd.openingHours = openingHours;
  }
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

// Groups consecutive days sharing identical hours (see groupOperatingHours)
// into display lines like "Monday – Friday: 09:00 – 18:00", in whichever
// locale's day names and "Closed" label the visitor is reading in.
function formatOperatingHoursLines(hours: OperatingHours, t: DirectoryStrings): string[] {
  return groupOperatingHours(hours).map((group) => {
    const first = t.dayLabels[group.days[0]];
    const last = t.dayLabels[group.days[group.days.length - 1]];
    const dayRange = group.days.length > 1 ? `${first} – ${last}` : first;
    const hoursText = group.hours ? `${group.hours.open} – ${group.hours.close}` : t.hoursClosedLabel;
    return `${dayRange}: ${hoursText}`;
  });
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
          <div className="mt-2 flex flex-wrap items-center gap-3 text-base text-slate-500 dark:text-slate-400">
            {listing.industry && <Badge>{INDUSTRY_LABELS[listing.industry]}</Badge>}
            {listing.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {listing.location}
              </span>
            )}
            {listing.website && (
              <a
                href={listing.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 text-petrol hover:underline dark:text-petrol-light"
              >
                <Globe className="h-4 w-4" />
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
                <CardTitle className="text-lg">{t.aboutHeading}</CardTitle>
              </CardHeader>
              <CardBody className="text-base text-slate-600 dark:text-slate-300">
                {renderMarkdownLite(listing.description)}
              </CardBody>
            </Card>
          )}
          {listing.services.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.servicesHeading}</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-wrap gap-2.5">
                {listing.services.map((service) => (
                  <Badge
                    key={service}
                    className="bg-led-soft px-4 py-2 text-base text-petrol-ink ring-led/30 dark:bg-led-soft-dark dark:text-petrol-light dark:ring-led/20"
                  >
                    {service}
                  </Badge>
                ))}
              </CardBody>
            </Card>
          )}
          {(mapAddress || listing.operatingHours) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.visitHeading}</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                {listing.address && (
                  <p className="flex items-start gap-2 text-base text-slate-600 dark:text-slate-300">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                    <span className="whitespace-pre-wrap">{listing.address}</span>
                  </p>
                )}
                {listing.operatingHours && (
                  <div className="flex items-start gap-2 text-base text-slate-600 dark:text-slate-300">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                    <ul>
                      {formatOperatingHoursLines(listing.operatingHours, t).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
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

        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.contactHeading}</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="mb-4 text-base text-slate-500 dark:text-slate-400">{t.contactSubheading}</p>
              <DirectoryLeadForm slug={slug} locale={locale} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

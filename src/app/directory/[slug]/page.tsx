import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Clock, Globe, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { DAYS_OF_WEEK, formatOpeningHoursSchema, readPublishedSnapshot, type OperatingHours } from "@/lib/directory";
import { renderMarkdownLite, stripMarkdownLiteToPlainText } from "@/lib/markdown-lite";
import { getDirectoryLocale } from "@/lib/directory-locale";
import { DIRECTORY_STRINGS, type DirectoryStrings } from "@/lib/directory-i18n";
import { getSiteOrigin } from "@/lib/site-url";
import { INDUSTRY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListingLogo } from "@/components/directory/listing-logo";
import { DirectoryLeadForm } from "@/components/directory/directory-lead-form";
import { ShareButton } from "@/components/directory/share-button";

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
  // link preview never shows literal "**"/"[]()" characters. seoTitle/
  // seoDescription (optionally AI-written — see generateListingSeoMeta)
  // take priority when a partner has set them; everything after is the
  // same fallback chain as before.
  const plainDescription = stripMarkdownLiteToPlainText(listing.description);
  const description =
    listing.seoDescription?.trim() ||
    listing.tagline ||
    (plainDescription ? plainDescription.slice(0, 160) : undefined) ||
    `${listing.companyName} on the business directory.`;
  const title = listing.seoTitle?.trim() || `${listing.companyName} | Business Directory`;
  const imageUrl = buildListingLogoUrl(listing, siteOrigin, slug) ?? `${siteOrigin}/icon-192.png`;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: "Business Directory",
      type: "website",
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [imageUrl],
    },
  };
}

// A listing's logo is stored as a data: URL (see photoDataUrl), which
// Open Graph/Twitter/JSON-LD can't use directly — those are read by a
// crawler that fetches the image URL itself, not by a browser rendering
// the page. /api/directory-images/logo/[slug] decodes and re-serves it
// under a real URL instead. Returns null when the listing has no logo —
// callers decide their own fallback (OG/Twitter want the app's own icon;
// JSON-LD's `image` is meant to represent this specific business, so it's
// left unset entirely rather than pointed at unrelated Gotka branding).
function buildListingLogoUrl(
  listing: NonNullable<Awaited<ReturnType<typeof getPublishedListing>>>,
  siteOrigin: string,
  slug: string,
): string | null {
  return listing.logoUrl ? `${siteOrigin}/api/directory-images/logo/${slug}` : null;
}

// Schema.org LocalBusiness markup — read by both search engines (SEO) and
// AI answer engines that crawl the page (GEO). Deliberately never includes
// a phone number: this is public, crawlable content, and the partner's own
// contact details stay internal (see PublishedListingSnapshot's own
// comment in src/lib/directory.ts) — a visitor reaches a partner only
// through the lead form below, never directly.
function buildJsonLd(
  listing: NonNullable<Awaited<ReturnType<typeof getPublishedListing>>>,
  url: string,
  imageUrl: string | null,
) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: listing.companyName,
    url,
  };
  const description = listing.seoDescription?.trim() || stripMarkdownLiteToPlainText(listing.description) || listing.tagline;
  if (description) jsonLd.description = description;
  if (imageUrl) jsonLd.image = imageUrl;
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
      ...(service.price ? { price: service.price } : {}),
      itemOffered: {
        "@type": "Service",
        name: service.title,
        ...(service.description ? { description: service.description } : {}),
      },
    }));
  }
  // JSON.stringify doesn't escape "</script>" — without this, a company
  // name or description containing that literal string could break out of
  // the script tag. < is invisible to JSON parsing but not to an HTML
  // tokenizer, so this neutralizes it either way.
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}

type HoursRow = { day: string; label: string; status: string; isToday: boolean };

// One row per day of the week (Monday–Sunday, always all seven) rather than
// collapsing consecutive matching days into a range — this is the display
// table on the detail page; buildJsonLd's own openingHours still uses the
// compact grouped form, which is what schema.org actually wants.
function buildHoursRows(hours: OperatingHours, t: DirectoryStrings): HoursRow[] {
  const jsDay = new Date().getDay(); // 0 (Sun) .. 6 (Sat)
  const todayKey = DAYS_OF_WEEK[(jsDay + 6) % 7]; // rotate to our Monday-first order
  return DAYS_OF_WEEK.map((day) => {
    const isToday = day === todayKey;
    const dayHours = hours[day];
    const status = dayHours
      ? `${isToday ? t.hoursOpenTodayLabel : t.hoursOpenLabel}: ${dayHours.open} – ${dayHours.close}`
      : isToday
        ? t.hoursClosedTodayLabel
        : t.hoursClosedLabel;
    return { day, label: t.dayLabels[day], status, isToday };
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
  const pageUrl = `${siteOrigin}/directory/${slug}`;

  return (
    <div className="w-full px-4 py-10 sm:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: buildJsonLd(listing, pageUrl, buildListingLogoUrl(listing, siteOrigin, slug)),
        }}
      />
      <div className="mb-8 flex flex-wrap items-start gap-4">
        <ListingLogo name={listing.companyName} logoUrl={listing.logoUrl} className="h-24 w-24 text-2xl" />
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
        <ShareButton title={listing.companyName} url={pageUrl} />
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

          {(listing.services.length > 0 || listing.operatingHours) && (
            <div
              className={cn(
                "grid gap-6",
                listing.services.length > 0 && listing.operatingHours ? "sm:grid-cols-2" : "",
              )}
            >
              {listing.services.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t.servicesHeading}</CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    {listing.services.map((service, index) => (
                      <div
                        key={index}
                        className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0 dark:border-neutral-800"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{service.title}</h3>
                          {service.price && (
                            <span className="shrink-0 text-sm font-medium text-petrol dark:text-petrol-light">
                              {service.price}
                            </span>
                          )}
                        </div>
                        {service.description && (
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{service.description}</p>
                        )}
                      </div>
                    ))}
                  </CardBody>
                </Card>
              )}
              {listing.operatingHours && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-1.5 text-lg">
                      <Clock className="h-4 w-4 text-slate-400" />
                      {t.hoursHeading}
                    </CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="overflow-hidden rounded-md border border-slate-200 dark:border-neutral-800">
                      <table className="w-full text-sm">
                        <tbody>
                          {buildHoursRows(listing.operatingHours, t).map((row) => (
                            <tr
                              key={row.day}
                              className={cn(
                                "border-b border-slate-200 last:border-b-0 dark:border-neutral-800",
                                row.isToday && "bg-led-soft dark:bg-led-soft-dark",
                              )}
                            >
                              <td
                                className={cn(
                                  "px-3 py-2 font-semibold text-slate-700 dark:text-slate-300",
                                  row.isToday && "text-petrol-ink dark:text-petrol-light",
                                )}
                              >
                                {row.label}
                              </td>
                              <td
                                className={cn(
                                  "px-3 py-2 text-slate-600 dark:text-slate-300",
                                  row.isToday && "font-semibold text-petrol-ink dark:text-petrol-light",
                                )}
                              >
                                {row.status}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          {mapAddress && (
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
                <iframe
                  title={`${listing.companyName} on the map`}
                  src={`https://www.google.com/maps?q=${encodeURIComponent(mapAddress.replace(/\n/g, ", "))}&output=embed`}
                  className="h-64 w-full rounded-md border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
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

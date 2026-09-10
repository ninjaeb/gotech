import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronDown, Clock, Globe, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import {
  currentDayInTimezone,
  DAYS_OF_WEEK,
  formatOpeningHoursSchema,
  isOpenNow,
  readPublishedSnapshot,
  slugify,
  type FaqEntry,
  type OperatingHours,
} from "@/lib/directory";
import { renderMarkdownLite, stripMarkdownLiteToPlainText } from "@/lib/markdown-lite";
import { resolveDirectoryLocale } from "@/lib/directory-locale";
import {
  DIRECTORY_STRINGS,
  DIRECTORY_LOCALES,
  INDUSTRY_LABELS_BY_LOCALE,
  directoryHomePath,
  directoryListingPath,
  formatRecommendMessage,
  type DirectoryStrings,
} from "@/lib/directory-i18n";
import { translateCategoryName, categoryPath } from "@/lib/directory-category-labels";
import { getSiteOrigin } from "@/lib/site-url";
import { INDUSTRY_LABELS } from "@/lib/labels";
import { directoryReferralUrl } from "@/lib/referrals";
import { getBusinessSessionPayload } from "@/lib/business/session";
import { cn } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ListingLogo } from "@/components/directory/listing-logo";
import { DirectoryLeadForm } from "@/components/directory/directory-lead-form";
import { InquiryProvider, InquiryScrollTarget } from "@/components/directory/listing-inquiry";
import { ServiceList } from "@/components/directory/service-list";
import { ShareButton } from "@/components/directory/share-button";
import { RecommendBar } from "@/components/directory/recommend-bar";

export const dynamic = "force-dynamic";

async function getPublishedListing(slug: string) {
  const listing = await db.partnerListing.findUnique({ where: { slug } });
  if (!listing) return null;
  const snapshot = readPublishedSnapshot(listing.publishedSnapshot);
  // id/partnerId ride along with the snapshot so the page can tell whose
  // listing this is — a partner gets a "Recommend" link for everyone
  // else's listing, never their own.
  return snapshot ? { ...snapshot, id: listing.id, partnerId: listing.partnerId } : null;
}

// Whether the visitor is a signed-in business owner with a referral code
// — the only visitor who gets the Recommend button. Reads the business
// session directly (non-redirecting) rather than requirePartner(): this is
// a public page, and a signed-out visitor is the normal case, not an
// error. A partner without a code (an account predating the referral
// program that hasn't opened its portal since) just doesn't get the
// button, same as anyone else.
async function getRecommendingPartner(): Promise<{ id: string; referralCode: string } | null> {
  const session = await getBusinessSessionPayload();
  if (!session?.userId) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, referralCode: true },
  });
  if (!user || user.role !== "PARTNER" || !user.referralCode) return null;
  return { id: user.id, referralCode: user.referralCode };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const resolved = resolveDirectoryLocale(locale);
  if (!resolved) return {};

  const listing = await getPublishedListing(slug);
  if (!listing) return {};

  const siteOrigin = await getSiteOrigin();
  const url = `${siteOrigin}${directoryListingPath(resolved, slug)}`;
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
    alternates: {
      canonical: url,
      // The page body itself does vary by language (see the translation
      // lookup below, in the page component) even though this title/
      // description stay the partner's own single-language SEO fields.
      languages: Object.fromEntries(
        DIRECTORY_LOCALES.map(({ code }) => [code, `${siteOrigin}${directoryListingPath(code, slug)}`]),
      ),
    },
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
  if (listing.address) jsonLd.address = listing.address;
  if (listing.website) jsonLd.sameAs = [listing.website];
  // English regardless of the page's own locale — schema.org's own
  // vocabulary/consumers (search engines, AI crawlers) expect this field in
  // a consistent language, unlike the human-visible badge below.
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

// FAQPage is normally its own top-level JSON-LD entity rather than nested
// inside LocalBusiness — a separate <script> block, same escaping as
// buildJsonLd above. Rich snippets are the SEO payoff; being directly
// quotable Q&A is the GEO one.
function buildFaqJsonLd(faqs: FaqEntry[]): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}

type HoursRow = { day: string; label: string; status: string; isToday: boolean };

// One row per day of the week (Monday–Sunday, always all seven) rather than
// collapsing consecutive matching days into a range — this is the display
// table on the detail page; buildJsonLd's own openingHours still uses the
// compact grouped form, which is what schema.org actually wants.
function buildHoursRows(hours: OperatingHours, t: DirectoryStrings, timezone: string | null): HoursRow[] {
  // Prefer the listing's own timezone for "today" — an older listing with
  // none set falls back to the server's local day rather than showing no
  // highlight at all.
  const jsDay = new Date().getDay(); // 0 (Sun) .. 6 (Sat)
  const serverTodayKey = DAYS_OF_WEEK[(jsDay + 6) % 7]; // rotate to our Monday-first order
  const todayKey = (timezone && currentDayInTimezone(timezone)) || serverTodayKey;
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

export default async function DirectoryListingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const resolved = resolveDirectoryLocale(locale);
  if (!resolved) notFound();

  // Reads the approved snapshot only — never the partner's live-editing
  // draft — same invariant the listing grid enforces (see
  // src/lib/directory.ts's PublishedListingSnapshot comment). A slug with
  // no snapshot at all (never approved, or since unpublished) 404s exactly
  // like one that doesn't exist.
  const listing = await getPublishedListing(slug);
  if (!listing) notFound();

  const siteOrigin = await getSiteOrigin();
  const t = DIRECTORY_STRINGS[resolved];
  const mapAddress = listing.address;
  const pageUrl = `${siteOrigin}${directoryListingPath(resolved, slug)}`;

  const recommender = await getRecommendingPartner();
  const recommendUrl =
    recommender && recommender.id !== listing.partnerId
      ? directoryReferralUrl(siteOrigin, recommender.referralCode, slug, resolved)
      : null;
  const recommendMessage = recommendUrl
    ? formatRecommendMessage(t.recommendMessage, listing.companyName, recommendUrl)
    : null;

  // The partner's own tagline/description/services/faqs stay the source of
  // truth — a translation only stands in for whichever field it actually
  // covers, so a half-filled translation (tagline only, say) still shows
  // the primary language's About text (or services/FAQ) rather than
  // leaving it blank. Company name is never translated — always shown
  // exactly as the partner entered it, regardless of locale.
  const translation = resolved === "zh" || resolved === "ms" ? listing.translations[resolved] : undefined;
  const displayTagline = translation?.tagline || listing.tagline;
  const displayDescription = translation?.description || listing.description;
  const displayServices = translation?.services?.length ? translation.services : listing.services;
  const displayFaqs = translation?.faqs?.length ? translation.faqs : listing.faqs;

  return (
    // Bottom padding clears whatever is pinned over the page's foot: the
    // mobile jump bar below (always, on small screens), plus the
    // RecommendBar's pill when a partner is signed in — which floats above
    // that jump bar on mobile and becomes its own strip from sm up.
    <div className={cn("w-full px-4 pb-24 sm:px-8 sm:pb-10", recommendUrl && "pb-40 sm:pb-28")}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: buildJsonLd(
            { ...listing, services: displayServices },
            pageUrl,
            buildListingLogoUrl(listing, siteOrigin, slug),
          ),
        }}
      />
      {displayFaqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: buildFaqJsonLd(displayFaqs) }}
        />
      )}
      <div className="mb-8 border-b border-slate-200 bg-white px-4 py-4 -mx-4 sm:-mx-8 sm:px-8 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-start gap-4">
          <ListingLogo name={listing.companyName} logoUrl={listing.logoUrl} className="h-[200px] w-[200px] text-4xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{listing.companyName}</h1>
            {displayTagline && <p className="mt-1 text-base text-slate-600 dark:text-slate-300">{displayTagline}</p>}
            {/* From sm up, industry/category/state/country/website live here
                — in the same column as the name and tagline, beside the
                logo — rather than their own full-width row further down,
                which otherwise leaves the space below a short tagline next
                to a 200px logo empty. Below sm there's no spare height left
                in this column for a phone-width logo, so the sm:hidden
                block after this row repeats the same content as its own
                full-width row instead. */}
            {(listing.industry || listing.categories.length > 0 || listing.state || listing.country || listing.website) && (
              <div className="mt-3 hidden flex-wrap items-center gap-2 text-base text-slate-500 dark:text-slate-400 sm:flex">
                {listing.industry && (
                  <Link href={`${directoryHomePath(resolved)}?industry=${listing.industry}`}>
                    <Badge className="bg-petrol px-2.5 py-1 text-sm font-semibold text-white ring-0 transition-colors hover:bg-petrol-ink dark:bg-petrol/70 dark:hover:bg-petrol">
                      {INDUSTRY_LABELS_BY_LOCALE[resolved][listing.industry]}
                    </Badge>
                  </Link>
                )}
                {listing.categories.map((category) => (
                  <Link key={category} href={categoryPath(slugify(category), resolved)}>
                    <Badge className="bg-petrol px-2.5 py-1 text-sm font-semibold text-white ring-0 transition-colors hover:bg-petrol-ink dark:bg-petrol/70 dark:hover:bg-petrol">
                      {translateCategoryName(category, resolved)}
                    </Badge>
                  </Link>
                ))}
                {listing.state && (
                  <Link
                    href={`${directoryHomePath(resolved)}?state=${encodeURIComponent(listing.state)}`}
                    className="inline-flex items-center gap-1 hover:text-petrol hover:underline dark:hover:text-petrol-light"
                  >
                    <MapPin className="h-4 w-4" />
                    {listing.state}
                  </Link>
                )}
                {listing.country && (
                  <Link
                    href={`${directoryHomePath(resolved)}?country=${encodeURIComponent(listing.country)}`}
                    className="hover:text-petrol hover:underline dark:hover:text-petrol-light"
                  >
                    {listing.country}
                  </Link>
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
            )}
          </div>
          {/* Share/Recommend live in the header's top-right corner from sm
              up — tablet has the same spare width desktop does, nothing
              here needs lg:'s extra room, so both get the stack. Recommend
              leads: vouching for someone else's listing is the deliberate,
              opt-in action, Share is the everyday one right below it.
              Below sm there's no corner left beside the logo, so the same
              two buttons render again, full-width side by side, in their
              own row under the badges instead — see the sm:hidden block
              below. */}
          <div className="hidden w-44 shrink-0 flex-col gap-2 sm:flex">
            {recommendUrl && (
              <ShareButton
                title={listing.companyName}
                url={recommendUrl}
                message={recommendMessage!}
                label={t.recommendLabel}
                icon="recommend"
                variant="primary"
                className="w-full bg-led text-led-ink hover:bg-led-hover active:bg-led-active focus-visible:ring-led"
              />
            )}
            <ShareButton title={listing.companyName} url={pageUrl} label={t.shareLabel} className="w-full" />
          </div>
        </div>

        {/* Phone-width fallback for the sm:+ version tucked into the name
            column above — same content, same order, just its own
            full-width row since there's no spare height beside the logo
            down here. */}
        {(listing.industry || listing.categories.length > 0 || listing.state || listing.country || listing.website) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-base text-slate-500 dark:text-slate-400 sm:hidden">
            {listing.industry && (
              <Link href={`${directoryHomePath(resolved)}?industry=${listing.industry}`}>
                <Badge className="bg-petrol px-2.5 py-1 text-sm font-semibold text-white ring-0 transition-colors hover:bg-petrol-ink dark:bg-petrol/70 dark:hover:bg-petrol">
                  {INDUSTRY_LABELS_BY_LOCALE[resolved][listing.industry]}
                </Badge>
              </Link>
            )}
            {listing.categories.map((category) => (
              <Link key={category} href={categoryPath(slugify(category), resolved)}>
                <Badge className="bg-petrol px-2.5 py-1 text-sm font-semibold text-white ring-0 transition-colors hover:bg-petrol-ink dark:bg-petrol/70 dark:hover:bg-petrol">
                  {translateCategoryName(category, resolved)}
                </Badge>
              </Link>
            ))}
            {listing.state && (
              <Link
                href={`${directoryHomePath(resolved)}?state=${encodeURIComponent(listing.state)}`}
                className="inline-flex items-center gap-1 hover:text-petrol hover:underline dark:hover:text-petrol-light"
              >
                <MapPin className="h-4 w-4" />
                {listing.state}
              </Link>
            )}
            {listing.country && (
              <Link
                href={`${directoryHomePath(resolved)}?country=${encodeURIComponent(listing.country)}`}
                className="hover:text-petrol hover:underline dark:hover:text-petrol-light"
              >
                {listing.country}
              </Link>
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
        )}

        {/* Phone-width fallback for the corner stack above — same two
            buttons, same order, just a full-width row since there's no
            room beside the logo down here. flex-wrap is the safety net on
            the narrowest phones: whitespace-nowrap label text (see
            ShareButton) won't shrink below its own width, so if both
            buttons together don't fit one line, the second wraps to its
            own full-width line rather than clipping. */}
        <div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden">
          {recommendUrl && (
            <ShareButton
              title={listing.companyName}
              url={recommendUrl}
              message={recommendMessage!}
              label={t.recommendLabel}
              icon="recommend"
              variant="primary"
              className="flex-1 justify-center bg-led text-led-ink hover:bg-led-hover active:bg-led-active focus-visible:ring-led"
            />
          )}
          <ShareButton title={listing.companyName} url={pageUrl} label={t.shareLabel} className="flex-1 justify-center" />
        </div>
      </div>

      <InquiryProvider>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {displayDescription && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t.aboutHeading}</CardTitle>
                </CardHeader>
                <CardBody className="text-base text-slate-600 dark:text-slate-300">
                  {renderMarkdownLite(displayDescription)}
                </CardBody>
              </Card>
            )}

            {(displayServices.length > 0 || listing.operatingHours) && (
              <div
                className={cn(
                  "grid gap-6",
                  displayServices.length > 0 && listing.operatingHours ? "sm:grid-cols-2" : "",
                )}
              >
                {displayServices.length > 0 && (
                  <Card id="services" className="scroll-mt-32">
                    <CardHeader>
                      <CardTitle className="text-base">{t.servicesHeading}</CardTitle>
                    </CardHeader>
                    <CardBody>
                      <ServiceList services={displayServices} />
                    </CardBody>
                  </Card>
                )}
                {listing.operatingHours && (
                  <Card>
                    <CardHeader className="gap-2">
                      <CardTitle className="flex items-center gap-1.5 text-base">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {t.hoursHeading}
                      </CardTitle>
                      {listing.timezone &&
                        (() => {
                          const openNow = isOpenNow(listing.operatingHours, listing.timezone);
                          if (openNow === null) return null;
                          return (
                            <Badge
                              className={
                                openNow
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                                  : "bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-slate-400"
                              }
                            >
                              {openNow ? t.hoursOpenNowBadge : t.hoursClosedNowBadge}
                            </Badge>
                          );
                        })()}
                    </CardHeader>
                    <CardBody>
                      <div className="overflow-hidden rounded-md border border-slate-200 dark:border-neutral-800">
                        <table className="w-full text-base">
                          <tbody>
                            {buildHoursRows(listing.operatingHours, t, listing.timezone).map((row) => (
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
                  <CardTitle className="text-base">{t.visitHeading}</CardTitle>
                </CardHeader>
                <CardBody className="space-y-4">
                  {listing.address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapAddress.replace(/\n/g, ", "))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 text-base text-slate-600 hover:text-petrol hover:underline dark:text-slate-300 dark:hover:text-petrol-light"
                    >
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                      <span className="whitespace-pre-wrap">{listing.address}</span>
                    </a>
                  )}
                  <iframe
                    title={`${listing.companyName} on the map`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(mapAddress.replace(/\n/g, ", "))}&output=embed`}
                    className="h-96 w-full rounded-md border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </CardBody>
              </Card>
            )}

            {displayFaqs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t.faqHeading}</CardTitle>
                </CardHeader>
                <CardBody className="space-y-2">
                  {displayFaqs.map((faq, index) => (
                    <details
                      key={index}
                      className="group rounded-md border border-slate-200 px-3 py-2 dark:border-neutral-800"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-base font-semibold text-slate-900 marker:content-none dark:text-slate-100">
                        {faq.question}
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="mt-2 text-base text-slate-600 dark:text-slate-300">{faq.answer}</p>
                    </details>
                  ))}
                </CardBody>
              </Card>
            )}
          </div>

          <InquiryScrollTarget id="contact" className="scroll-mt-32 lg:sticky lg:top-32 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.contactHeading}</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="mb-4 text-base text-slate-500 dark:text-slate-400">{t.contactSubheading}</p>
                <DirectoryLeadForm slug={slug} locale={resolved} />
              </CardBody>
            </Card>
          </InquiryScrollTarget>
        </div>
      </InquiryProvider>

      {recommendUrl && (
        <RecommendBar
          title={listing.companyName}
          url={recommendUrl}
          message={recommendMessage!}
          label={t.recommendBusinessCta}
        />
      )}

      {/* Mobile only — on lg+ the Get in touch card is already visible in
          the sticky right-hand column, so this would just duplicate it. */}
      <nav
        aria-label={t.stickyNavLabel}
        className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:hidden dark:border-neutral-800 dark:bg-neutral-900"
      >
        {displayServices.length > 0 && (
          <a href="#services" className={buttonClasses("secondary", "md", "flex-1 justify-center")}>
            {t.servicesHeading}
          </a>
        )}
        <a
          href="#contact"
          className={buttonClasses("primary", "md", "flex-1 justify-center bg-led text-led-ink hover:bg-led-hover active:bg-led-active focus-visible:ring-led")}
        >
          {t.contactHeading}
        </a>
      </nav>
    </div>
  );
}

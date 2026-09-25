import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSiteOrigin } from "@/lib/site-url";
import {
  DIRECTORY_STRINGS,
  DIRECTORY_HOME_TITLE_BY_LOCALE,
  INDUSTRY_LABELS_BY_LOCALE,
  directoryHomePath,
  type DirectoryLocale,
} from "@/lib/directory-i18n";
import {
  findStateBySlug,
  buildDirectoryCollectionJsonLd,
  buildBreadcrumbJsonLd,
  countListingsByState,
  loadPublishedListings,
  toDirectoryGridListing,
} from "@/lib/directory";
import {
  DIRECTORY_ROBOTS,
  DIRECTORY_SITE_NAME_BY_LOCALE,
  OG_LOCALE_BY_DIRECTORY_LOCALE,
  buildLanguageAlternates,
  directoryShareImage,
} from "@/lib/directory-seo";
import { locationPath, locationPageTitle, locationPageHeading, locationPageDescription } from "@/lib/directory-location-labels";
import { translateCategoryName } from "@/lib/directory-category-labels";
import { slugify } from "@/lib/slug";
import { INDUSTRIES } from "@/lib/labels";
import { DirectorySearch } from "@/components/directory/directory-search";
import { DirectoryBreadcrumbs } from "@/components/directory/directory-breadcrumbs";

// Shared by every locale variant of the friendly location route (see
// src/app/[locale]/business/location/[stateSlug]/page.tsx), same division
// of labor as buildCategoryMetadata/CategoryPageContent. No noindex branch
// here the way the category version has: a category can exist in
// BusinessCategory with zero published listings, but a state slug only
// ever resolves (see findStateBySlug) when at least one published listing
// actually carries it — there's no "empty location page" to keep out of
// the index in the first place.
export async function buildLocationMetadata(stateSlug: string, locale: DirectoryLocale): Promise<Metadata> {
  const [siteOrigin, rows] = await Promise.all([getSiteOrigin(), loadPublishedListings()]);
  const state = findStateBySlug(rows, stateSlug);
  if (!state) return {};

  const title = locationPageTitle(state, locale);
  const description = locationPageDescription(state, locale);
  const url = `${siteOrigin}${locationPath(stateSlug, locale)}`;
  const shareImage = directoryShareImage(siteOrigin, locale);

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: buildLanguageAlternates(siteOrigin, (code) => locationPath(stateSlug, code)),
    },
    robots: DIRECTORY_ROBOTS,
    openGraph: {
      title,
      description,
      url,
      siteName: DIRECTORY_SITE_NAME_BY_LOCALE[locale],
      type: "website",
      locale: OG_LOCALE_BY_DIRECTORY_LOCALE[locale],
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImage],
    },
  };
}

export async function LocationPageContent({
  stateSlug,
  locale,
  q,
}: {
  stateSlug: string;
  locale: DirectoryLocale;
  q: string;
}) {
  const [siteOrigin, rows, businessCategories] = await Promise.all([
    getSiteOrigin(),
    loadPublishedListings(),
    db.businessCategory.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  const state = findStateBySlug(rows, stateSlug);
  if (!state) notFound();

  const t = DIRECTORY_STRINGS[locale];
  const pageUrl = `${siteOrigin}${locationPath(stateSlug, locale)}`;
  const heading = locationPageHeading(state, locale);
  const description = locationPageDescription(state, locale);

  const listings = rows.map((row) => toDirectoryGridListing(row, locale));
  const locationListings = listings.filter((listing) => listing.state === state);
  const breadcrumbItems = [
    { name: DIRECTORY_HOME_TITLE_BY_LOCALE[locale], url: `${siteOrigin}${directoryHomePath(locale)}` },
    { name: heading, url: pageUrl },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  // Every other state at least one published listing carries — a location
  // page otherwise has no on-page link to a sibling state, only reachable
  // by going back through the home page's own "Browse by location"
  // section (see DirectoryHomeSections). No noindex-to-avoid concern here
  // the way category's equivalent list has: see buildLocationMetadata's
  // own comment on why there's no such thing as an empty state.
  const otherStates = [...countListingsByState(rows).keys()].filter((name) => name !== state).sort((a, b) => a.localeCompare(b));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: buildDirectoryCollectionJsonLd(locationListings, pageUrl, siteOrigin, heading, locale, description),
        }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
      <div className="w-full px-4 pt-4 sm:px-8">
        <DirectoryBreadcrumbs items={breadcrumbItems} navLabel={t.breadcrumbNavLabel} />
      </div>
      <DirectorySearch
        listings={listings}
        industries={INDUSTRIES}
        industryLabels={INDUSTRY_LABELS_BY_LOCALE[locale]}
        categories={businessCategories.map((row) => ({ value: row.name, label: translateCategoryName(row.name, locale) }))}
        t={t}
        locale={locale}
        initialQuery={q}
        initialIndustry=""
        initialCategory=""
        initialState={state}
        initialCountry=""
        directoryUrl={pageUrl}
        heading={heading}
        subheading={description}
      />
      {otherStates.length > 0 && (
        <section aria-labelledby="other-locations" className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-8">
          <h2 id="other-locations" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t.otherLocationsHeading}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {otherStates.map((name) => (
              <li key={name}>
                <Link
                  href={locationPath(slugify(name), locale)}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-petrol/40 hover:text-petrol dark:border-neutral-700 dark:bg-neutral-800 dark:text-slate-200 dark:hover:border-petrol-light/40 dark:hover:text-petrol-light"
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

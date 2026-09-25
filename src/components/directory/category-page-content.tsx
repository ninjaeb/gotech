import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { getSiteOrigin } from "@/lib/site-url";
import {
  DIRECTORY_STRINGS,
  DIRECTORY_HOME_TITLE_BY_LOCALE,
  INDUSTRY_LABELS_BY_LOCALE,
  directoryHomePath,
  type DirectoryLocale,
} from "@/lib/directory-i18n";
import {
  findCategoryBySlug,
  buildDirectoryCollectionJsonLd,
  buildBreadcrumbJsonLd,
  countListingsByCategory,
  loadPublishedListings,
  toDirectoryGridListing,
} from "@/lib/directory";
import {
  DIRECTORY_NOINDEX_ROBOTS,
  DIRECTORY_ROBOTS,
  DIRECTORY_SITE_NAME_BY_LOCALE,
  OG_LOCALE_BY_DIRECTORY_LOCALE,
  buildLanguageAlternates,
  directoryShareImage,
} from "@/lib/directory-seo";
import { translateCategoryName, categoryPath, categoryPageTitle, categoryPageHeading, categoryPageDescription } from "@/lib/directory-category-labels";
import { INDUSTRIES } from "@/lib/labels";
import { DirectorySearch } from "@/components/directory/directory-search";
import { DirectoryBreadcrumbs } from "@/components/directory/directory-breadcrumbs";

// Shared by every locale variant of the friendly category route (see
// src/app/[locale]/business/category/[categorySlug]/page.tsx) so the
// fetch/render logic — and the metadata it produces — exists exactly once
// regardless of which language a visitor lands on.
export async function buildCategoryMetadata(categorySlug: string, locale: DirectoryLocale): Promise<Metadata> {
  const category = await findCategoryBySlug(categorySlug);
  if (!category) return {};

  const [siteOrigin, rows] = await Promise.all([getSiteOrigin(), loadPublishedListings()]);
  const hasListings = (countListingsByCategory(rows).get(category) ?? 0) > 0;
  const title = categoryPageTitle(category, locale);
  const description = categoryPageDescription(category, locale);
  const url = `${siteOrigin}${categoryPath(categorySlug, locale)}`;

  const shareImage = directoryShareImage(siteOrigin, locale);

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: buildLanguageAlternates(siteOrigin, (code) => categoryPath(categorySlug, code)),
    },
    // A category nobody has published into yet is a page of nothing but
    // "No businesses found" — kept out of the index (and out of the
    // sitemap, see sitemap-generator.ts) rather than competing with the
    // real pages as thin content. Still crawlable with its links followed,
    // and this flips back on its own the moment a listing carries it.
    robots: hasListings ? DIRECTORY_ROBOTS : DIRECTORY_NOINDEX_ROBOTS,
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

export async function CategoryPageContent({
  categorySlug,
  locale,
  q,
}: {
  categorySlug: string;
  locale: DirectoryLocale;
  q: string;
}) {
  const category = await findCategoryBySlug(categorySlug);
  if (!category) notFound();

  const siteOrigin = await getSiteOrigin();
  const t = DIRECTORY_STRINGS[locale];
  const pageUrl = `${siteOrigin}${categoryPath(categorySlug, locale)}`;
  const heading = categoryPageHeading(category, locale);
  const description = categoryPageDescription(category, locale);

  const [rows, businessCategories] = await Promise.all([
    loadPublishedListings(),
    db.businessCategory.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  const listings = rows.map((row) => toDirectoryGridListing(row, locale));
  const categoryListings = listings.filter((listing) => listing.categories.includes(category));
  const breadcrumbItems = [
    { name: DIRECTORY_HOME_TITLE_BY_LOCALE[locale], url: `${siteOrigin}${directoryHomePath(locale)}` },
    { name: heading, url: pageUrl },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  // Every other category with at least one published listing — a category
  // page otherwise has no on-page link to a sibling category at all, only
  // reachable by going back to the home page's own category grid (see
  // DirectoryHomeSections). Same "populated only" rule as that grid: an
  // empty category's own page is noindex (see buildCategoryMetadata), so
  // linking to one here would only lead somewhere search engines are asked
  // to skip.
  const countByCategory = countListingsByCategory(rows);
  const otherCategories = businessCategories
    .map((row) => row.name)
    .filter((name) => name !== category && (countByCategory.get(name) ?? 0) > 0);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: buildDirectoryCollectionJsonLd(categoryListings, pageUrl, siteOrigin, heading, locale, description),
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
        initialCategory={category}
        initialState=""
        initialCountry=""
        directoryUrl={pageUrl}
        heading={heading}
        subheading={description}
      />
      {otherCategories.length > 0 && (
        <section aria-labelledby="other-categories" className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-8">
          <h2 id="other-categories" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t.otherCategoriesHeading}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {otherCategories.map((name) => (
              <li key={name}>
                <Link
                  href={categoryPath(slugify(name), locale)}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-petrol/40 hover:text-petrol dark:border-neutral-700 dark:bg-neutral-800 dark:text-slate-200 dark:hover:border-petrol-light/40 dark:hover:text-petrol-light"
                >
                  {translateCategoryName(name, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

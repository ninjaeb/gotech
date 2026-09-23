import type { Metadata } from "next";
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
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: DIRECTORY_HOME_TITLE_BY_LOCALE[locale], url: `${siteOrigin}${directoryHomePath(locale)}` },
    { name: heading, url: pageUrl },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: buildDirectoryCollectionJsonLd(categoryListings, pageUrl, siteOrigin, heading, locale, description),
        }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
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
    </>
  );
}

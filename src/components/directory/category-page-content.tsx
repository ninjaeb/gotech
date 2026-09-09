import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSiteOrigin } from "@/lib/site-url";
import { DIRECTORY_STRINGS, DIRECTORY_LOCALES, INDUSTRY_LABELS_BY_LOCALE, type DirectoryLocale } from "@/lib/directory-i18n";
import {
  findCategoryBySlug,
  readPublishedSnapshot,
  slugify,
  buildDirectoryCollectionJsonLd,
  type PublishedListingSnapshot,
} from "@/lib/directory";
import { translateCategoryName, categoryPath, categoryPageTitle, categoryPageHeading, categoryPageDescription } from "@/lib/directory-category-labels";
import { INDUSTRIES } from "@/lib/labels";
import { DirectorySearch } from "@/components/directory/directory-search";

// Shared by every locale variant of the friendly category route (see
// src/app/directory/category/[categorySlug]/page.tsx for English and
// .../[locale]/page.tsx for /zh, /ms) so the fetch/render logic — and the
// metadata it produces — exists exactly once regardless of which URL a
// visitor lands on.
export async function buildCategoryMetadata(categorySlug: string, locale: DirectoryLocale): Promise<Metadata> {
  const category = await findCategoryBySlug(categorySlug);
  if (!category) return {};

  const siteOrigin = await getSiteOrigin();
  const title = categoryPageTitle(category, locale);
  const description = categoryPageDescription(category, locale);
  const imageUrl = `${siteOrigin}/icon-512.png`;
  const url = `${siteOrigin}${categoryPath(categorySlug, locale)}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        DIRECTORY_LOCALES.map(({ code }) => [code, `${siteOrigin}${categoryPath(categorySlug, code)}`]),
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
    db.partnerListing.findMany({
      select: { slug: true, publishedSnapshot: true },
      orderBy: { publishedAt: "desc" },
    }),
    db.businessCategory.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  const listings = rows
    .map((row) => ({ slug: row.slug, listing: readPublishedSnapshot(row.publishedSnapshot) }))
    .filter((row): row is { slug: string; listing: PublishedListingSnapshot } => row.listing !== null);
  const categoryListings = listings.filter(({ listing }) => listing.categories.includes(category));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: buildDirectoryCollectionJsonLd(categoryListings, pageUrl, siteOrigin, heading, description),
        }}
      />
      <DirectorySearch
        listings={listings}
        industries={INDUSTRIES}
        industryLabels={INDUSTRY_LABELS_BY_LOCALE[locale]}
        categories={businessCategories.map((row) => ({ value: row.name, label: translateCategoryName(row.name, locale) }))}
        t={t}
        initialQuery={q}
        initialIndustry=""
        initialCategory={category}
        directoryUrl={pageUrl}
        heading={heading}
        subheading={description}
        categoryLinks={businessCategories.map((row) => ({
          name: translateCategoryName(row.name, locale),
          href: categoryPath(slugify(row.name), locale),
        }))}
      />
    </>
  );
}

import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getSiteOrigin } from "@/lib/site-url";
import { slugify } from "@/lib/directory";
import { categoryPath } from "@/lib/directory-category-labels";
import { DIRECTORY_LOCALES, directoryHomePath, directoryListingPath, type DirectoryLocale } from "@/lib/directory-i18n";

// Every language of every page is its own real, indexable URL now (see
// directoryHomePath/directoryListingPath/categoryPath) — so each is listed
// as its own sitemap entry, carrying `alternates.languages` back to the
// other two (itself included, which is what a correct hreflang set
// requires) rather than one "canonical" URL with the others only
// referenced as alternates.
function languageAlternates(pathFor: (locale: DirectoryLocale) => string, siteOrigin: string): Record<string, string> {
  return Object.fromEntries(DIRECTORY_LOCALES.map(({ code }) => [code, `${siteOrigin}${pathFor(code)}`]));
}

// The only part of this app crawlers can actually reach — everything else
// sits behind the login wall (see robots.ts), so this lists just the
// public directory: its home page, every currently-published partner
// listing, and every business category's own friendly page.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteOrigin = await getSiteOrigin();
  const [listings, categories] = await Promise.all([
    db.partnerListing.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.businessCategory.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  const homeEntries: MetadataRoute.Sitemap = DIRECTORY_LOCALES.map(({ code }) => ({
    url: `${siteOrigin}${directoryHomePath(code)}`,
    changeFrequency: "daily",
    priority: 0.8,
    alternates: { languages: languageAlternates(directoryHomePath, siteOrigin) },
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.flatMap(({ name }) => {
    const categorySlug = slugify(name);
    return DIRECTORY_LOCALES.map(({ code }) => ({
      url: `${siteOrigin}${categoryPath(categorySlug, code)}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
      alternates: { languages: languageAlternates((locale) => categoryPath(categorySlug, locale), siteOrigin) },
    }));
  });

  const listingEntries: MetadataRoute.Sitemap = listings.flatMap(({ slug, updatedAt }) =>
    DIRECTORY_LOCALES.map(({ code }) => ({
      url: `${siteOrigin}${directoryListingPath(code, slug)}`,
      lastModified: updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      alternates: { languages: languageAlternates((locale) => directoryListingPath(locale, slug), siteOrigin) },
    })),
  );

  return [...homeEntries, ...categoryEntries, ...listingEntries];
}

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

// The public directory is what crawlers can actually reach — this lists
// its home page, every currently-published partner listing, and every
// business category's own friendly page. /business-portal is listed too,
// deliberately, even though robots.ts disallows crawling it — this tells a
// search engine the URL exists (so "Sign in to your business" can still
// surface as a known, bookmarkable entry point for a partner searching for
// their own portal by name) without asking it to crawl or index whatever's
// behind the login wall. Google's own guidance is that a disallowed URL in
// a sitemap is unusual and it will generally show as "Submitted URL
// blocked by robots.txt" in Search Console rather than "Indexed" —
// expected, not a bug, given what this is deliberately asking for.
// /system (the internal staff CRM) is deliberately NOT listed here, even
// though robots.ts disallows it too — unlike the business portal, nobody
// outside the company is ever going to search for it by name, so there's
// no upside to naming it in a document search engines actually read,
// versus the business portal's genuine "a partner is looking for this"
// use case above.
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

  const gatedEntryPoints: MetadataRoute.Sitemap = [
    { url: `${siteOrigin}/business-portal`, changeFrequency: "monthly", priority: 0.3 },
  ];

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

  return [...gatedEntryPoints, ...homeEntries, ...categoryEntries, ...listingEntries];
}

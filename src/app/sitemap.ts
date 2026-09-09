import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getSiteOrigin } from "@/lib/site-url";
import { slugify } from "@/lib/directory";
import { categoryPath } from "@/lib/directory-category-labels";
import { DIRECTORY_LOCALES } from "@/lib/directory-i18n";

// Every language variant of a URL is either a path segment (a category
// page's own /zh or /ms — see categoryPath) or ?lang=<code> on the same
// physical page (the home page and every listing; see
// getDirectoryLocale/isDirectoryLocale) — never a separate translated copy.
function languageAlternates(pathFor: (locale: (typeof DIRECTORY_LOCALES)[number]["code"]) => string): Record<string, string> {
  return Object.fromEntries(DIRECTORY_LOCALES.map(({ code }) => [code, pathFor(code)]));
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

  const directoryUrl = `${siteOrigin}/directory`;

  return [
    {
      url: directoryUrl,
      changeFrequency: "daily",
      priority: 0.8,
      alternates: { languages: languageAlternates((code) => (code === "en" ? directoryUrl : `${directoryUrl}?lang=${code}`)) },
    },
    ...categories.map(({ name }) => {
      const categorySlug = slugify(name);
      const url = `${siteOrigin}${categoryPath(categorySlug, "en")}`;
      return {
        url,
        changeFrequency: "daily" as const,
        priority: 0.7,
        alternates: { languages: languageAlternates((code) => `${siteOrigin}${categoryPath(categorySlug, code)}`) },
      };
    }),
    ...listings.map(({ slug, updatedAt }) => {
      const url = `${siteOrigin}/directory/${slug}`;
      return {
        url,
        lastModified: updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
        alternates: { languages: languageAlternates((code) => (code === "en" ? url : `${url}?lang=${code}`)) },
      };
    }),
  ];
}

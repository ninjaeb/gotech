import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getDirectoryLocale, isDirectoryLocale } from "@/lib/directory-locale";
import { DIRECTORY_STRINGS, DIRECTORY_LOCALES, INDUSTRY_LABELS_BY_LOCALE } from "@/lib/directory-i18n";
import { translateCategoryName } from "@/lib/directory-category-labels";
import { readPublishedSnapshot, buildDirectoryCollectionJsonLd, type PublishedListingSnapshot } from "@/lib/directory";
import { INDUSTRIES } from "@/lib/labels";
import { DirectorySearch } from "@/components/directory/directory-search";
import { getSiteOrigin } from "@/lib/site-url";

const TITLE_BY_LOCALE = {
  en: "Business Directory",
  zh: "企业目录",
  ms: "Direktori Perniagaan",
};
const DESCRIPTION_BY_LOCALE = {
  en: "Browse trusted businesses in the Gotka network and reach out directly — search by name, service, or category.",
  zh: "浏览 Gotka 网络中值得信赖的企业 — 按名称、服务或类别搜索并直接联系。",
  ms: "Semak imbas perniagaan yang dipercayai dalam rangkaian Gotka — cari mengikut nama, perkhidmatan atau kategori.",
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const [{ lang }, siteOrigin, cookieLocale] = await Promise.all([searchParams, getSiteOrigin(), getDirectoryLocale()]);
  const locale = isDirectoryLocale(lang) ? lang : cookieLocale;
  const title = TITLE_BY_LOCALE[locale];
  const description = DESCRIPTION_BY_LOCALE[locale];
  const imageUrl = `${siteOrigin}/icon-512.png`;
  const url = `${siteOrigin}/directory`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      // Read by search engines to serve the right language variant of the
      // same URL directly from results — every language variant is the
      // same physical page (?lang= overrides the cookie/Accept-Language
      // guess), never a separate translated copy.
      languages: Object.fromEntries(DIRECTORY_LOCALES.map(({ code }) => [code, code === "en" ? url : `${url}?lang=${code}`])),
    },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: TITLE_BY_LOCALE.en,
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

// Listings are approved by hand and change rarely, but a plain Prisma read
// carries no dynamic signal of its own — without this the page would get
// frozen into the build's static output the first time it renders, and
// every visitor after that would see whatever set of partners existed then.
export const dynamic = "force-dynamic";

export default async function DirectoryHomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; industry?: string; category?: string; lang?: string }>;
}) {
  const { q, industry, category, lang } = await searchParams;
  const [cookieLocale, siteOrigin] = await Promise.all([getDirectoryLocale(), getSiteOrigin()]);
  const locale = isDirectoryLocale(lang) ? lang : cookieLocale;
  const t = DIRECTORY_STRINGS[locale];
  const directoryUrl = `${siteOrigin}/directory`;

  // Fetched whole and handed to a client component that filters live as
  // the visitor types (see DirectorySearch) — not filtered here anymore,
  // since a server round trip per keystroke isn't needed at this scale (a
  // partner network is small by nature: dozens, not thousands) and the
  // searchable text lives inside publishedSnapshot's JSON, which
  // MySQL/Prisma can't cheaply query into either way.
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: buildDirectoryCollectionJsonLd(listings, directoryUrl, siteOrigin, TITLE_BY_LOCALE[locale]),
        }}
      />
      <DirectorySearch
        listings={listings}
        industries={INDUSTRIES}
        industryLabels={INDUSTRY_LABELS_BY_LOCALE[locale]}
        categories={businessCategories.map((row) => ({ value: row.name, label: translateCategoryName(row.name, locale) }))}
        t={t}
        initialQuery={q ?? ""}
        initialIndustry={industry ?? ""}
        initialCategory={category ?? ""}
        directoryUrl={directoryUrl}
      />
    </>
  );
}

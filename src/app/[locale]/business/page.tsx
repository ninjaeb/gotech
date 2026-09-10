import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { resolveDirectoryLocale } from "@/lib/directory-locale";
import { DIRECTORY_STRINGS, DIRECTORY_LOCALES, INDUSTRY_LABELS_BY_LOCALE, directoryHomePath } from "@/lib/directory-i18n";
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
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolved = resolveDirectoryLocale(locale);
  if (!resolved) return {};

  const siteOrigin = await getSiteOrigin();
  const title = TITLE_BY_LOCALE[resolved];
  const description = DESCRIPTION_BY_LOCALE[resolved];
  const imageUrl = `${siteOrigin}/icon-512.png`;
  const url = `${siteOrigin}${directoryHomePath(resolved)}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      // Every language variant is its own real, indexable URL now (see
      // directoryHomePath) — never a query-param variant of one canonical
      // page — so this just lists all three, itself included.
      languages: Object.fromEntries(DIRECTORY_LOCALES.map(({ code }) => [code, `${siteOrigin}${directoryHomePath(code)}`])),
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
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; industry?: string; category?: string; state?: string; country?: string }>;
}) {
  const [{ locale }, { q, industry, category, state, country }, siteOrigin] = await Promise.all([
    params,
    searchParams,
    getSiteOrigin(),
  ]);
  const resolved = resolveDirectoryLocale(locale);
  if (!resolved) notFound();

  const t = DIRECTORY_STRINGS[resolved];
  const directoryUrl = `${siteOrigin}${directoryHomePath(resolved)}`;

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
          __html: buildDirectoryCollectionJsonLd(listings, directoryUrl, siteOrigin, TITLE_BY_LOCALE[resolved]),
        }}
      />
      <DirectorySearch
        listings={listings}
        industries={INDUSTRIES}
        industryLabels={INDUSTRY_LABELS_BY_LOCALE[resolved]}
        categories={businessCategories.map((row) => ({ value: row.name, label: translateCategoryName(row.name, resolved) }))}
        t={t}
        locale={resolved}
        initialQuery={q ?? ""}
        initialIndustry={industry ?? ""}
        initialCategory={category ?? ""}
        initialState={state ?? ""}
        initialCountry={country ?? ""}
        directoryUrl={directoryUrl}
      />
    </>
  );
}

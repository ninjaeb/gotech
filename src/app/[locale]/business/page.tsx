import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { resolveDirectoryLocale } from "@/lib/directory-locale";
import {
  DIRECTORY_STRINGS,
  DIRECTORY_HOME_TITLE_BY_LOCALE,
  INDUSTRY_LABELS_BY_LOCALE,
  directoryHomePath,
  type DirectoryLocale,
} from "@/lib/directory-i18n";
import { translateCategoryName } from "@/lib/directory-category-labels";
import { DIRECTORY_HOME_COPY } from "@/lib/directory-home-copy";
import {
  DIRECTORY_ROBOTS,
  DIRECTORY_SITE_NAME_BY_LOCALE,
  OG_LOCALE_BY_DIRECTORY_LOCALE,
  buildDirectoryOrganizationJsonLd,
  buildDirectoryWebSiteJsonLd,
  buildFaqJsonLd,
  buildLanguageAlternates,
  directoryShareImage,
} from "@/lib/directory-seo";
import {
  buildDirectoryCollectionJsonLd,
  countListingsByCategory,
  countListingsByState,
  loadPublishedListings,
  toDirectoryGridListing,
} from "@/lib/directory";
import { INDUSTRIES } from "@/lib/labels";
import { DirectorySearch } from "@/components/directory/directory-search";
import { DirectoryHomeSections } from "@/components/directory/directory-home-sections";
import { getSiteOrigin } from "@/lib/site-url";

// <title>/og:title: the brand and what's here, not just the page's own name
// (DIRECTORY_HOME_TITLE_BY_LOCALE stays the H1/breadcrumb name). Under ~60
// characters so it isn't truncated in a result.
const SEO_TITLE_BY_LOCALE: Record<DirectoryLocale, string> = {
  en: "Business Directory – Trusted Businesses & Services | Gotka",
  zh: "企业目录 – 值得信赖的企业与服务 | Gotka",
  ms: "Direktori Perniagaan – Perniagaan & Perkhidmatan Dipercayai | Gotka",
};

const DESCRIPTION_BY_LOCALE: Record<DirectoryLocale, string> = {
  en: "Find trusted businesses in the Gotka network — compare products, services, hours and locations, then contact them directly. In English, 中文 and Bahasa Melayu.",
  zh: "在 Gotka 网络中寻找值得信赖的企业——比较产品、服务、营业时间与地点，并直接联系他们。提供英文、中文和马来文版本。",
  ms: "Cari perniagaan yang dipercayai dalam rangkaian Gotka — bandingkan produk, perkhidmatan, waktu operasi dan lokasi, kemudian hubungi mereka terus. Dalam Bahasa Inggeris, Cina dan Melayu.",
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
  const title = SEO_TITLE_BY_LOCALE[resolved];
  const description = DESCRIPTION_BY_LOCALE[resolved];
  const url = `${siteOrigin}${directoryHomePath(resolved)}`;

  const shareImage = directoryShareImage(siteOrigin, resolved);

  return {
    title,
    description,
    alternates: {
      canonical: url,
      // Every language variant is its own real, indexable URL (see
      // directoryHomePath) — never a query-param variant of one canonical
      // page — so this lists all three, itself included, plus x-default.
      languages: buildLanguageAlternates(siteOrigin, directoryHomePath),
    },
    robots: DIRECTORY_ROBOTS,
    openGraph: {
      title,
      description,
      url,
      siteName: DIRECTORY_SITE_NAME_BY_LOCALE[resolved],
      type: "website",
      locale: OG_LOCALE_BY_DIRECTORY_LOCALE[resolved],
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
  const homePath = directoryHomePath(resolved);
  const directoryUrl = `${siteOrigin}${homePath}`;

  // Fetched whole and handed to a client component that filters live as
  // the visitor types (see DirectorySearch) — not filtered here anymore,
  // since a server round trip per keystroke isn't needed at this scale (a
  // partner network is small by nature: dozens, not thousands) and the
  // searchable text lives inside publishedSnapshot's JSON, which
  // MySQL/Prisma can't cheaply query into either way. Only the grid's own
  // slice of each snapshot goes over the wire, though (see
  // toDirectoryGridListing).
  const [rows, businessCategories] = await Promise.all([
    loadPublishedListings(),
    db.businessCategory.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  const listings = rows.map((row) => toDirectoryGridListing(row, resolved));
  const countByCategory = countListingsByCategory(rows);
  // The dropdown above the grid still offers every category as a filter;
  // only the ones with a published business get a real link below it.
  const linkedCategories = businessCategories.flatMap((row) => {
    const count = countByCategory.get(row.name) ?? 0;
    return count > 0 ? [{ name: row.name, count }] : [];
  });
  const linkedStates = [...countListingsByState(rows)].map(([name, count]) => ({ name, count }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildDirectoryWebSiteJsonLd(siteOrigin, resolved, homePath) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: buildDirectoryOrganizationJsonLd(siteOrigin) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: buildDirectoryCollectionJsonLd(
            listings,
            directoryUrl,
            siteOrigin,
            DIRECTORY_HOME_TITLE_BY_LOCALE[resolved],
            resolved,
            DESCRIPTION_BY_LOCALE[resolved],
          ),
        }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: buildFaqJsonLd(DIRECTORY_HOME_COPY[resolved].faqs) }} />
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
      <DirectoryHomeSections locale={resolved} categories={linkedCategories} states={linkedStates} />
    </>
  );
}

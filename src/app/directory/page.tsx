import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getDirectoryLocale } from "@/lib/directory-locale";
import { DIRECTORY_STRINGS } from "@/lib/directory-i18n";
import { readPublishedSnapshot, type PublishedListingSnapshot } from "@/lib/directory";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/labels";
import { DirectorySearch } from "@/components/directory/directory-search";

export const metadata: Metadata = {
  title: "Partner Directory | Gotka",
  description: "Browse trusted partner businesses in the Gotka network.",
  robots: { index: true, follow: true },
};

// Listings are approved by hand and change rarely, but a plain Prisma read
// carries no dynamic signal of its own — without this the page would get
// frozen into the build's static output the first time it renders, and
// every visitor after that would see whatever set of partners existed then.
export const dynamic = "force-dynamic";

export default async function DirectoryHomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; industry?: string }>;
}) {
  const { q, industry } = await searchParams;
  const locale = await getDirectoryLocale();
  const t = DIRECTORY_STRINGS[locale];

  // Fetched whole and handed to a client component that filters live as
  // the visitor types (see DirectorySearch) — not filtered here anymore,
  // since a server round trip per keystroke isn't needed at this scale (a
  // partner network is small by nature: dozens, not thousands) and the
  // searchable text lives inside publishedSnapshot's JSON, which
  // MySQL/Prisma can't cheaply query into either way.
  const rows = await db.partnerListing.findMany({
    select: { slug: true, publishedSnapshot: true },
    orderBy: { publishedAt: "desc" },
  });
  const listings = rows
    .map((row) => ({ slug: row.slug, listing: readPublishedSnapshot(row.publishedSnapshot) }))
    .filter((row): row is { slug: string; listing: PublishedListingSnapshot } => row.listing !== null);

  return (
    <DirectorySearch
      listings={listings}
      industries={INDUSTRIES}
      industryLabels={INDUSTRY_LABELS}
      t={t}
      initialQuery={q ?? ""}
      initialIndustry={industry ?? ""}
    />
  );
}

import { Search, Handshake } from "lucide-react";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getDirectoryLocale } from "@/lib/directory-locale";
import { DIRECTORY_STRINGS } from "@/lib/directory-i18n";
import { readPublishedSnapshot, type PublishedListingSnapshot } from "@/lib/directory";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/labels";
import { ListingCard } from "@/components/directory/listing-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";

export const metadata: Metadata = {
  title: "Partner Directory | Gotka",
  description: "Browse trusted partner businesses in the Gotka network.",
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

  // Filtered in memory rather than at the database — a partner network is
  // small by nature (dozens, not thousands), and the searchable text lives
  // inside publishedSnapshot's JSON, which MySQL/Prisma can't cheaply query
  // into. Fetching every listing and filtering here is simpler and, at this
  // scale, no slower than a real query would be.
  const rows = await db.partnerListing.findMany({
    select: { slug: true, publishedSnapshot: true },
    orderBy: { publishedAt: "desc" },
  });
  const listings = rows
    .map((row) => ({ slug: row.slug, listing: readPublishedSnapshot(row.publishedSnapshot) }))
    .filter((row): row is { slug: string; listing: PublishedListingSnapshot } => row.listing !== null);

  const query = q?.trim().toLowerCase();
  const filtered = listings.filter(({ listing }) => {
    if (industry && listing.industry !== industry) return false;
    if (!query) return true;
    return (
      listing.companyName.toLowerCase().includes(query) ||
      listing.services.some((service) => service.toLowerCase().includes(query))
    );
  });

  return (
    <div>
      <div className="border-b border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="w-full px-4 py-14 text-center sm:px-8">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100 sm:text-4xl">{t.heroTitle}</h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-500 dark:text-slate-400">{t.heroSubtitle}</p>

          <form className="mx-auto mt-6 flex max-w-xl flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input type="text" name="q" defaultValue={q} placeholder={t.searchPlaceholder} className="pl-9" />
            </div>
            <Select name="industry" defaultValue={industry ?? ""} className="sm:w-56">
              <option value="">{t.allIndustries}</option>
              {INDUSTRIES.map((code) => (
                <option key={code} value={code}>
                  {INDUSTRY_LABELS[code]}
                </option>
              ))}
            </Select>
            <button
              type="submit"
              aria-label="Search"
              className="flex h-11 shrink-0 items-center justify-center rounded-md bg-indigo-600 px-5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="w-full px-4 py-10 sm:px-8">
        {filtered.length === 0 ? (
          <EmptyState icon={Handshake} title={t.noResultsTitle} description={t.noResultsDescription} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(({ slug, listing }) => (
              <ListingCard key={slug} slug={slug} listing={listing} viewLabel={t.viewListing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

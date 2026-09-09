"use client";

import { useMemo, useState } from "react";
import { Search, Handshake } from "lucide-react";
import { ListingCard } from "@/components/directory/listing-card";
import { ShareButton } from "@/components/directory/share-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import type { PublishedListingSnapshot } from "@/lib/directory";
import type { Industry } from "@/generated/prisma/client";
import type { DirectoryStrings } from "@/lib/directory-i18n";

type ListingRow = { slug: string; listing: PublishedListingSnapshot };

export function DirectorySearch({
  listings,
  industries,
  industryLabels,
  categories,
  t,
  initialQuery,
  initialIndustry,
  initialCategory,
  directoryUrl,
}: {
  listings: ListingRow[];
  industries: Industry[];
  industryLabels: Record<Industry, string>;
  categories: string[];
  t: DirectoryStrings;
  initialQuery: string;
  initialIndustry: string;
  initialCategory: string;
  directoryUrl: string;
}) {
  // Filters entirely in the browser as the user types — no round trip, no
  // debounce needed. Safe because the whole listing set is fetched once up
  // front: a partner network is small by nature (dozens, not thousands),
  // the same reasoning the server-side filter this replaced already relied
  // on (see the page's own fetch comment).
  const [query, setQuery] = useState(initialQuery);
  const [industry, setIndustry] = useState(initialIndustry);
  const [category, setCategory] = useState(initialCategory);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter(({ listing }) => {
      if (industry && listing.industry !== industry) return false;
      if (category && !listing.categories.includes(category)) return false;
      if (!q) return true;
      return (
        listing.companyName.toLowerCase().includes(q) ||
        listing.services.some(
          (service) => service.title.toLowerCase().includes(q) || service.description.toLowerCase().includes(q),
        )
      );
    });
  }, [listings, query, industry, category]);

  return (
    <>
      <div className="border-b border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="w-full px-4 py-14 text-center sm:px-8">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100 sm:text-4xl">{t.heroTitle}</h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-500 dark:text-slate-400">{t.heroSubtitle}</p>
          <div className="mt-4 flex justify-center">
            <ShareButton title={t.heroTitle} url={directoryUrl} />
          </div>

          <form
            onSubmit={(event) => event.preventDefault()}
            className="mx-auto mt-6 flex max-w-xl flex-col flex-wrap gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.searchPlaceholder}
                className="pl-9"
              />
            </div>
            <Select value={industry} onChange={(event) => setIndustry(event.target.value)} className="sm:w-56">
              <option value="">{t.allIndustries}</option>
              {industries.map((code) => (
                <option key={code} value={code}>
                  {industryLabels[code]}
                </option>
              ))}
            </Select>
            {categories.length > 0 && (
              <Select value={category} onChange={(event) => setCategory(event.target.value)} className="sm:w-56">
                <option value="">{t.allCategories}</option>
                {categories.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            )}
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
    </>
  );
}

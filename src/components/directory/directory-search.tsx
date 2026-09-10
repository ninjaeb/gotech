"use client";

import { useMemo, useState } from "react";
import { Search, Handshake, X } from "lucide-react";
import { ListingCard } from "@/components/directory/listing-card";
import { ShareButton } from "@/components/directory/share-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import type { PublishedListingSnapshot } from "@/lib/directory";
import type { Industry } from "@/generated/prisma/client";
import type { DirectoryLocale, DirectoryStrings } from "@/lib/directory-i18n";

type ListingRow = { slug: string; listing: PublishedListingSnapshot };

export function DirectorySearch({
  listings,
  industries,
  industryLabels,
  categories,
  t,
  locale,
  initialQuery,
  initialIndustry,
  initialCategory,
  initialState,
  initialCountry,
  directoryUrl,
  heading,
  subheading,
}: {
  listings: ListingRow[];
  industries: Industry[];
  industryLabels: Record<Industry, string>;
  // value stays the English category name a listing's snapshot actually
  // stores (see readPublishedSnapshot) so filtering/the URL query param
  // keep matching regardless of locale; label is that name translated for
  // display (see translateCategoryName).
  categories: { value: string; label: string }[];
  t: DirectoryStrings;
  locale: DirectoryLocale;
  initialQuery: string;
  initialIndustry: string;
  initialCategory: string;
  // Set from a listing's own State/Country pill (see the listing detail
  // page) — no dropdown for these, since they're free text rather than a
  // fixed enum like industry, but the URL query param still filters the
  // same in-memory list the same way.
  initialState: string;
  initialCountry: string;
  directoryUrl: string;
  // A category page passes its own category-specific H1/subtitle (better
  // on-page SEO than the generic homepage copy repeated under every
  // category); the home page omits these and gets t.heroTitle/heroSubtitle.
  heading?: string;
  subheading?: string;
}) {
  // Filters entirely in the browser as the user types — no round trip, no
  // debounce needed. Safe because the whole listing set is fetched once up
  // front: a partner network is small by nature (dozens, not thousands),
  // the same reasoning the server-side filter this replaced already relied
  // on (see the page's own fetch comment).
  const [query, setQuery] = useState(initialQuery);
  const [industry, setIndustry] = useState(initialIndustry);
  const [category, setCategory] = useState(initialCategory);
  // No dropdown for these (see the type comment above) — set once from the
  // URL a State/Country pill linked to, cleared only via the chip below.
  const [state, setState] = useState(initialState);
  const [country, setCountry] = useState(initialCountry);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter(({ listing }) => {
      if (industry && listing.industry !== industry) return false;
      if (category && !listing.categories.includes(category)) return false;
      if (state && listing.state !== state) return false;
      if (country && listing.country !== country) return false;
      if (!q) return true;
      return (
        listing.companyName.toLowerCase().includes(q) ||
        listing.services.some(
          (service) => service.title.toLowerCase().includes(q) || service.description.toLowerCase().includes(q),
        )
      );
    });
  }, [listings, query, industry, category, state, country]);

  return (
    <>
      <div className="border-b border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="w-full px-4 py-14 text-center sm:px-8">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100 sm:text-4xl">
            {heading ?? t.heroTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-500 dark:text-slate-400">{subheading ?? t.heroSubtitle}</p>
          <div className="mt-4 flex justify-center">
            <ShareButton title={heading ?? t.heroTitle} url={directoryUrl} />
          </div>

          <form onSubmit={(event) => event.preventDefault()} className="mx-auto mt-6 max-w-2xl">
            <div className="relative mx-auto w-full sm:w-4/5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.searchPlaceholder}
                className="pl-9"
              />
            </div>
            <div className="mt-3 flex flex-col flex-wrap justify-center gap-2 sm:flex-row">
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
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </form>

          {/* Only ever set by following a listing's own State/Country pill
              (see the listing detail page) — there's no dropdown for these
              (free text, not a fixed enum like industry), so a plain chip
              with its own clear button is the only way back to the
              unfiltered list. */}
          {(state || country) && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
              {state && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-slate-700 dark:bg-neutral-800 dark:text-slate-200">
                  {state}
                  <button
                    type="button"
                    onClick={() => setState("")}
                    aria-label={`Clear ${state} filter`}
                    className="rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-neutral-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              {country && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-slate-700 dark:bg-neutral-800 dark:text-slate-200">
                  {country}
                  <button
                    type="button"
                    onClick={() => setCountry("")}
                    aria-label={`Clear ${country} filter`}
                    className="rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-neutral-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="w-full px-4 py-10 sm:px-8">
        {filtered.length === 0 ? (
          <EmptyState icon={Handshake} title={t.noResultsTitle} description={t.noResultsDescription} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(({ slug, listing }) => (
              <ListingCard
                key={slug}
                slug={slug}
                listing={listing}
                viewLabel={t.viewListing}
                industryLabel={listing.industry ? industryLabels[listing.industry] : undefined}
                locale={locale}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Check, MapPin, Search, Sparkles } from "lucide-react";
import {
  autoCreateListingDetails,
  searchBusinessOnGoogleMaps,
  type AutoCreatedListingDetails,
} from "@/app/actions/directory";
import type { PlaceSearchResult } from "@/lib/google-places";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

// The "AI Auto Business Details Creation" section at the top of the
// listing editor: find the business on Google Maps (which fills in the
// Website field straight away), then one click drafts the rest of the
// listing from that listing and the website. The form itself owns every
// field this writes into — this component only reports back through the
// two callbacks, so it never has to know how the form stores its state.
export function AiAutoCreatePanel({
  placesAvailable,
  defaultQuery,
  getContext,
  onWebsiteFound,
  onCreated,
}: {
  placesAvailable: boolean;
  defaultQuery: string;
  getContext: () => { companyName: string; website: string };
  onWebsiteFound: (website: string) => void;
  onCreated: (details: AutoCreatedListingDetails) => void;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<PlaceSearchResult[] | null>(null);
  const [selected, setSelected] = useState<PlaceSearchResult | null>(null);
  const [searching, startSearch] = useTransition();
  const [creating, startCreate] = useTransition();
  const toast = useToast();

  function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;
    startSearch(async () => {
      const result = await searchBusinessOnGoogleMaps(trimmed);
      if (result.status === "ok") {
        setResults(result.data.places);
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleSelect(place: PlaceSearchResult) {
    setSelected(place);
    setResults(null);
    if (place.website) onWebsiteFound(place.website);
  }

  function handleCreate() {
    const context = getContext();
    startCreate(async () => {
      const result = await autoCreateListingDetails({
        placeId: selected?.id,
        website: context.website,
        companyName: context.companyName,
      });
      if (result.status !== "ok") {
        toast.error(result.message);
        return;
      }
      onCreated(result.data);
      const { googleMaps, website } = result.data.sources;
      toast.success(
        googleMaps && !website && context.website
          ? "Details created from your Google Maps listing — your website couldn't be read. Review each section, then save."
          : "Details created — review each section, then save.",
      );
    });
  }

  return (
    <section className="rounded-md border border-slate-200 p-4 dark:border-neutral-800">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-petrol dark:text-petrol-light" />
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI Auto Business Details Creation</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Find your business on Google Maps, and AI drafts the rest of this listing from that and your website —
            About, Products &amp; services, FAQ, industry, categories, operating hours, and address. Review everything
            before saving.
          </p>
        </div>
      </div>

      {placesAvailable ? (
        <div className="mt-3">
          <Label htmlFor="places-search">Your business on Google Maps</Label>
          <div className="flex gap-2">
            <Input
              id="places-search"
              value={query}
              onChange={(event) => {
                // Not part of the listing itself, so typing here shouldn't
                // count as an edit for the form's own "Saved" tracking.
                event.stopPropagation();
                setQuery(event.target.value);
              }}
              onKeyDown={(event) => {
                // Enter here means "search", never "save the whole listing".
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Business name and city, e.g. Acme Printing Kuala Lumpur"
              autoComplete="off"
            />
            <Button type="button" variant="secondary" onClick={handleSearch} disabled={searching} className="h-11 shrink-0">
              <Search className="h-4 w-4" />
              {searching ? "Searching…" : "Search"}
            </Button>
          </div>

          {results && results.length === 0 && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No matches — try adding the city or area.</p>
          )}
          {results && results.length > 0 && (
            <ul className="mt-2 divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 dark:divide-neutral-800 dark:border-neutral-800">
              {results.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(place)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-neutral-800"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-900 dark:text-slate-100">{place.name}</span>
                      {place.address && (
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{place.address}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selected && (
            <div className="mt-2 flex items-start gap-2 rounded-md bg-led-soft px-3 py-2 text-sm text-slate-700 dark:bg-led-soft-dark dark:text-slate-200">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-petrol-ink dark:text-petrol-light" />
              <div className="min-w-0 flex-1">
                <span className="block font-medium">{selected.name}</span>
                {selected.address && <span className="block text-xs">{selected.address}</span>}
                <span className="block text-xs">
                  {selected.website
                    ? `Website: ${selected.website} — filled into the Website field below.`
                    : "No website on this Google listing — fill in the Website field below if you have one."}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="shrink-0 text-xs text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Change
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-400">
          Google Maps search isn&apos;t configured (GOOGLE_PLACES_API_KEY) — AI Auto Create will work from the Website
          field below instead.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="bg-led text-led-ink hover:bg-led-hover active:bg-led-active focus-visible:ring-led"
        >
          <Sparkles className="h-4 w-4" />
          {creating ? "Creating…" : "AI Auto Create"}
        </Button>
        <p className="text-xs text-slate-400">
          {creating
            ? "Reading the Google listing and website, then writing — this can take up to a minute."
            : "Replaces About, tagline, Products & services, FAQ, industry, categories, hours, and address with a fresh AI draft."}
        </p>
      </div>
    </section>
  );
}

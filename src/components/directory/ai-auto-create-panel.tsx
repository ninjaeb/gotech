"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, MapPin, Sparkles } from "lucide-react";
import {
  autoCreateListingDetails,
  searchBusinessOnGoogleMaps,
  type AutoCreatedListingDetails,
} from "@/app/actions/directory";
import type { PlaceSearchResult } from "@/lib/google-places";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Label } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

const SEARCH_DEBOUNCE_MS = 500;
const MIN_QUERY_LENGTH = 2;

// The "AI Auto Business Details Creation" section at the top of the
// listing editor — only ever rendered by the form when aiAvailable is true
// (see partner-listing-form.tsx, which renders a bare Website field in its
// place otherwise). Owns the Website field itself, since this is where it
// gets filled in from: find the business on Google Maps (which fills
// Website straight away), then one click drafts the rest of the listing
// from that listing and the website. The form itself owns every field this
// writes into — this component only reports back through the callbacks, so
// it never has to know how the form stores its state.
export function AiAutoCreatePanel({
  placesAvailable,
  defaultQuery,
  website,
  onWebsiteChange,
  getContext,
  onCreated,
  formId,
}: {
  placesAvailable: boolean;
  defaultQuery: string;
  website: string;
  onWebsiteChange: (website: string) => void;
  getContext: () => { companyName: string };
  onCreated: (details: AutoCreatedListingDetails) => void;
  // Id of the listing form this panel's Website field submits with — needed
  // because this panel now renders as a sibling of that <form> (to sit
  // beside Public URL in the editor's first row), not a descendant of it.
  formId: string;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<PlaceSearchResult[] | null>(null);
  const [selected, setSelected] = useState<PlaceSearchResult | null>(null);
  const [searching, startSearch] = useTransition();
  const [creating, startCreate] = useTransition();
  const toast = useToast();
  // Guards against an earlier (slower) debounced search's result landing
  // after a newer one's — only the most recently *started* search is
  // allowed to write to `results`.
  const searchSeq = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function runSearch(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults(null);
      return;
    }
    const seq = ++searchSeq.current;
    startSearch(async () => {
      const result = await searchBusinessOnGoogleMaps(trimmed);
      if (seq !== searchSeq.current) return;
      if (result.status === "ok") setResults(result.data.places);
      else toast.error(result.message);
    });
  }

  // Live search as the partner types — no button to click. Debounced so
  // pausing mid-word doesn't fire a new (billed) request on every
  // keystroke; a query shorter than MIN_QUERY_LENGTH never searches at all.
  useEffect(() => {
    if (!placesAvailable) return;
    debounceRef.current = setTimeout(() => runSearch(query), SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, placesAvailable]);

  function handleSelect(place: PlaceSearchResult) {
    setSelected(place);
    setResults(null);
    if (place.website) onWebsiteChange(place.website);
  }

  function handleCreate() {
    const context = getContext();
    startCreate(async () => {
      const result = await autoCreateListingDetails({ placeId: selected?.id, website, companyName: context.companyName });
      if (result.status !== "ok") {
        toast.error(result.message);
        return;
      }
      onCreated(result.data);
      const { googleMaps, website: fromWebsite } = result.data.sources;
      toast.success(
        googleMaps && !fromWebsite && website
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

      {placesAvailable && (
        <div className="mt-3">
          <Label htmlFor="places-search">Your business on Google Maps</Label>
          <Input
            id="places-search"
            value={query}
            onChange={(event) => {
              // Not part of the listing itself, so typing here shouldn't
              // count as an edit for the form's own "Saved" tracking.
              event.stopPropagation();
              const value = event.target.value;
              setQuery(value);
              // Clears immediately rather than waiting out the debounce —
              // only the search request itself needs to wait.
              if (value.trim().length < MIN_QUERY_LENGTH) setResults(null);
            }}
            onKeyDown={(event) => {
              // Enter searches right away instead of waiting out the
              // debounce — never submits the whole listing form.
              if (event.key === "Enter") {
                event.preventDefault();
                if (debounceRef.current) clearTimeout(debounceRef.current);
                runSearch(query);
              }
            }}
            placeholder="Business name and city, e.g. Acme Printing Kuala Lumpur"
            autoComplete="off"
          />

          {searching && (!results || results.length === 0) && (
            <p className="mt-2 text-sm text-slate-400">Searching…</p>
          )}
          {!searching && results && results.length === 0 && (
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
      )}

      <FieldGroup label="Website" htmlFor="website" className="mt-3">
        <Input
          id="website"
          name="website"
          form={formId}
          value={website}
          onChange={(event) => onWebsiteChange(event.target.value)}
          placeholder="acme.com"
        />
        <p className="mt-1 text-xs text-slate-400">
          {placesAvailable
            ? "Filled in automatically when you pick a business above — edit it any time."
            : "Google Maps search isn't configured (GOOGLE_PLACES_API_KEY) — AI Auto Create reads this site directly instead."}
        </p>
      </FieldGroup>

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

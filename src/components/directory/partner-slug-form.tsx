"use client";

import { useActionState, useState } from "react";
import { updateListingSlug } from "@/app/actions/directory";
import { directoryListingPath } from "@/lib/directory-i18n";
import { slugify } from "@/lib/slug";
import { Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function PartnerSlugForm({
  listingId,
  slug,
  siteOrigin,
  autoSlugSource,
}: {
  listingId: string;
  slug: string;
  siteOrigin: string;
  // The company name AI Auto Create just found (see handleAutoCreated in
  // partner-listing-form.tsx) — suggests a URL from it, same as a partner
  // typing it in by hand would, rather than leaving the slug this listing
  // was created with (generated from the partner's own account name, which
  // rarely matches the actual business). Only ever pre-fills the input;
  // still requires its own explicit Update address click to save, same as
  // any other edit here — AI Auto Create writes content, never a live URL,
  // without a partner's own confirmation.
  autoSlugSource?: string;
}) {
  const [state, formAction, pending] = useActionState(updateListingSlug.bind(null, listingId), undefined);
  const [value, setValue] = useState(slug);

  // Reflects a successful change immediately — the input already shows
  // what the visitor's link now points at, without waiting on the page's
  // own revalidation to catch up. Updating state during render (not in an
  // effect) when `state` has changed since the last render is React's own
  // documented way to do this without an extra render round-trip.
  const [lastSyncedState, setLastSyncedState] = useState(state);
  if (state !== lastSyncedState) {
    setLastSyncedState(state);
    if (state && "success" in state) setValue(state.slug);
  }

  const [lastSyncedAutoSlugSource, setLastSyncedAutoSlugSource] = useState(autoSlugSource);
  if (autoSlugSource !== lastSyncedAutoSlugSource) {
    setLastSyncedAutoSlugSource(autoSlugSource);
    if (autoSlugSource) setValue(slugify(autoSlugSource));
  }

  const prefix = `${siteOrigin}${directoryListingPath("en", "")}`;

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="slug">Web address</Label>
        <div className="flex items-stretch overflow-hidden rounded-md ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-led dark:ring-neutral-700">
          <span className="flex shrink-0 items-center bg-slate-50 pl-3 pr-1 text-sm text-slate-500 dark:bg-neutral-800 dark:text-slate-400">
            {prefix}
          </span>
          <input
            id="slug"
            name="slug"
            required
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="h-11 min-w-0 flex-1 border-0 bg-transparent px-1 text-sm text-slate-900 focus:outline-none focus:ring-0 dark:text-slate-100"
          />
        </div>
        <p className="mt-1 text-xs text-slate-400">Letters, numbers, and hyphens only.</p>
        <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
          Don&apos;t change this after you go live — anyone with the old link gets a not-found page instead.
        </p>
      </div>

      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}

      <Button
        type="submit"
        disabled={pending || value === slug}
        className="bg-led text-led-ink hover:bg-led-hover active:bg-led-active focus-visible:ring-led"
      >
        {pending ? "Saving…" : "Update address"}
      </Button>
    </form>
  );
}

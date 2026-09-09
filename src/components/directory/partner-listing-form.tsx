"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import {
  rewriteListingDescription,
  rewriteListingServices,
  saveDirectoryListing,
  submitDirectoryListingForReview,
  type ListingFormField,
  type ListingFormValues,
} from "@/app/actions/directory";
import { Button, buttonClasses } from "@/components/ui/button";
import { FieldGroup, Input, Label, RequiredMark, Select, Textarea } from "@/components/ui/field";
import { ListingLogo } from "@/components/directory/listing-logo";
import { MarkdownLiteEditor } from "@/components/directory/markdown-lite-editor";
import { OperatingHoursEditor } from "@/components/directory/operating-hours-editor";
import { useToast } from "@/components/ui/toast";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/labels";
import type { PartnerListingStatus } from "@/generated/prisma/client";
import type { OperatingHours } from "@/lib/operating-hours";

export function PartnerListingForm({
  values,
  logoUrl,
  operatingHours,
  status,
  aiAvailable,
}: {
  values: ListingFormValues;
  logoUrl: string | null;
  operatingHours: OperatingHours | null;
  status: PartnerListingStatus;
  aiAvailable: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveDirectoryListing, undefined);
  const [logoPreview, setLogoPreview] = useState(logoUrl);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [submitPending, startSubmitTransition] = useTransition();
  const toast = useToast();

  const current = state && "values" in state ? state.values : values;

  // Both saveDirectoryListing (via `state` above) and
  // submitDirectoryListingForReview (via handleSubmitForReview below) can
  // fail with an error tied to one specific field. useActionState's own
  // `state` never resets itself when the *other* action runs, so it can't
  // be read directly here — synced into this instead, so whichever action
  // most recently resolved is what's actually shown, not a stale leftover
  // from the other one. Updating state during render (not in an effect)
  // when `state` has changed since the last render is React's own
  // documented way to do this without an extra render round-trip.
  const [displayError, setDisplayError] = useState<{ error: string; field?: ListingFormField } | null>(null);
  const [lastSyncedState, setLastSyncedState] = useState(state);
  if (state !== lastSyncedState) {
    setLastSyncedState(state);
    if (state && "error" in state) setDisplayError({ error: state.error, field: state.field });
    else if (state && "success" in state) setDisplayError(null);
  }
  const companyNameError = displayError?.field === "companyName" ? displayError.error : null;
  const servicesError = displayError?.field === "services" ? displayError.error : null;
  const generalError = displayError && !displayError.field ? displayError.error : null;

  // Company name and industry stay plain defaultValue inputs (unchanged
  // below) — they're only grounding context for the AI rewrite, never
  // rewritten themselves, so reading them live off the form via FormData at
  // rewrite time is enough; they don't need to be controlled state.
  const formRef = useRef<HTMLFormElement>(null);
  const [description, setDescription] = useState(current.description);
  const [services, setServices] = useState(current.services);
  const [rewritingDescription, startRewriteDescription] = useTransition();
  const [rewritingServices, startRewriteServices] = useTransition();

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setRemoveLogo(false);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function handleSubmitForReview() {
    const formData = new FormData(formRef.current ?? undefined);
    startSubmitTransition(async () => {
      const result = await submitDirectoryListingForReview(undefined, formData);
      if (result && "error" in result) {
        setDisplayError({ error: result.error, field: result.field });
      } else {
        setDisplayError(null);
        toast.success("Submitted — an admin will review it shortly.");
      }
    });
  }

  function contextFromForm(): { companyName: string; industry: string } {
    const formData = new FormData(formRef.current ?? undefined);
    return {
      companyName: String(formData.get("companyName") || ""),
      industry: String(formData.get("industry") || ""),
    };
  }

  function handleRewriteDescription() {
    const context = contextFromForm();
    startRewriteDescription(async () => {
      const result = await rewriteListingDescription(description, { ...context, services });
      if (result.status === "ok") setDescription(result.data.text);
      else toast.error(result.message);
    });
  }

  function handleRewriteServices() {
    const context = contextFromForm();
    startRewriteServices(async () => {
      const result = await rewriteListingServices(services, { ...context, description });
      if (result.status === "ok") setServices(result.data.text);
      else toast.error(result.message);
    });
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <div>
        <Label htmlFor="logo">Logo</Label>
        <div className="flex items-center gap-4">
          <ListingLogo name={current.companyName || "?"} logoUrl={removeLogo ? null : logoPreview} className="h-14 w-14 text-lg" />
          <div className="flex-1 space-y-2">
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleLogoChange}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-400 dark:file:bg-neutral-800 dark:file:text-slate-200 dark:hover:file:bg-neutral-700"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">JPEG, PNG, WebP, or GIF, under 3MB.</p>
            {logoPreview && !removeLogo && (
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  name="removeLogo"
                  checked={removeLogo}
                  onChange={(event) => setRemoveLogo(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-led focus:ring-led"
                />
                Remove current logo
              </label>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Company name" htmlFor="companyName" required>
          <Input id="companyName" name="companyName" required defaultValue={current.companyName} />
          {companyNameError && <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{companyNameError}</p>}
        </FieldGroup>
        <FieldGroup label="Industry" htmlFor="industry">
          <Select id="industry" name="industry" defaultValue={current.industry}>
            <option value="">Not set</option>
            {INDUSTRIES.map((code) => (
              <option key={code} value={code}>
                {INDUSTRY_LABELS[code]}
              </option>
            ))}
          </Select>
        </FieldGroup>
      </div>

      <FieldGroup label="Tagline" htmlFor="tagline">
        <Input id="tagline" name="tagline" defaultValue={current.tagline} placeholder="One line under your company name" maxLength={140} />
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Website" htmlFor="website">
          <Input id="website" name="website" defaultValue={current.website} placeholder="acme.com" />
        </FieldGroup>
        <FieldGroup label="Location" htmlFor="location">
          <Input id="location" name="location" defaultValue={current.location} placeholder="Kuala Lumpur, Malaysia" />
        </FieldGroup>
      </div>

      <FieldGroup label="Address" htmlFor="address">
        <Textarea
          id="address"
          name="address"
          rows={2}
          defaultValue={current.address}
          placeholder={"123 Jalan Bukit Bintang\n50200 Kuala Lumpur, Malaysia"}
        />
        <p className="mt-1 text-xs text-slate-400">
          Shown on your listing with a map. Leave blank to skip the map — Location above still shows either way.
        </p>
      </FieldGroup>

      <div>
        <Label>Operating hours</Label>
        <OperatingHoursEditor initialHours={operatingHours} />
        <p className="mt-1 text-xs text-slate-400">Shown on your listing exactly as set here.</p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <Label htmlFor="description" className="mb-0">
            About
          </Label>
          {aiAvailable && (
            <button
              type="button"
              onClick={handleRewriteDescription}
              disabled={rewritingDescription}
              className={buttonClasses("ghost", "sm", "shrink-0")}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {rewritingDescription ? "Rewriting…" : "Rewrite with AI"}
            </button>
          )}
        </div>
        <MarkdownLiteEditor
          id="description"
          name="description"
          rows={5}
          value={description}
          onChange={setDescription}
          placeholder="What does your business do?"
        />
        <p className="mt-1 text-xs text-slate-400">
          Select text and use the toolbar for <strong>bold</strong>, lists, links, and images — or switch to Preview
          to see how it&apos;ll look.
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <Label htmlFor="services" className="mb-0">
            Services
            <RequiredMark />
          </Label>
          {aiAvailable && (
            <button
              type="button"
              onClick={handleRewriteServices}
              disabled={rewritingServices}
              className={buttonClasses("ghost", "sm", "shrink-0")}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {rewritingServices ? "Rewriting…" : "Rewrite with AI"}
            </button>
          )}
        </div>
        <Textarea
          id="services"
          name="services"
          rows={4}
          value={services}
          onChange={(event) => setServices(event.target.value)}
          placeholder={"One service per line, e.g.\nWeb design\nSEO\nHosting"}
        />
        {servicesError ? (
          <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{servicesError}</p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">
            One per line (or comma-separated) — shown as tags on your listing. At least one is required before you
            can submit for review.
          </p>
        )}
      </div>

      {generalError && <p className="text-sm text-rose-600 dark:text-rose-400">{generalError}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          disabled={pending}
          className="bg-led text-led-ink hover:bg-led-hover active:bg-led-active focus-visible:ring-led"
        >
          {pending ? "Saving…" : "Save draft"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={submitPending || status === "PENDING_REVIEW"}
          onClick={handleSubmitForReview}
        >
          {submitPending ? "Submitting…" : status === "PENDING_REVIEW" ? "Awaiting review" : "Submit for review"}
        </Button>
      </div>
    </form>
  );
}

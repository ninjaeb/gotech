"use client";

import { useActionState, useState, useTransition } from "react";
import {
  saveDirectoryListing,
  submitDirectoryListingForReview,
  type ListingFormValues,
} from "@/app/actions/directory";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Label, Select, Textarea } from "@/components/ui/field";
import { ListingLogo } from "@/components/directory/listing-logo";
import { useToast } from "@/components/ui/toast";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/labels";
import type { PartnerListingStatus } from "@/generated/prisma/client";

export function PartnerListingForm({
  values,
  logoUrl,
  status,
}: {
  values: ListingFormValues;
  logoUrl: string | null;
  status: PartnerListingStatus;
}) {
  const [state, formAction, pending] = useActionState(saveDirectoryListing, undefined);
  const [logoPreview, setLogoPreview] = useState(logoUrl);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [submitPending, startSubmitTransition] = useTransition();
  const toast = useToast();

  const current = state && "values" in state ? state.values : values;

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setRemoveLogo(false);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function handleSubmitForReview() {
    startSubmitTransition(async () => {
      const result = await submitDirectoryListingForReview();
      if ("error" in result) toast.error(result.error);
      else toast.success("Submitted — an admin will review it shortly.");
    });
  }

  return (
    <form action={formAction} className="space-y-5">
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
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
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

      <FieldGroup label="About" htmlFor="description">
        <Textarea id="description" name="description" rows={5} defaultValue={current.description} placeholder="What does your business do?" />
      </FieldGroup>

      <FieldGroup label="Services" htmlFor="services">
        <Textarea
          id="services"
          name="services"
          rows={4}
          defaultValue={current.services}
          placeholder={"One service per line, e.g.\nWeb design\nSEO\nHosting"}
        />
        <p className="mt-1 text-xs text-slate-400">One per line (or comma-separated) — shown as tags on your listing.</p>
      </FieldGroup>

      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
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

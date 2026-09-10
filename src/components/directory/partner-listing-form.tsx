"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import {
  generateListingFaqs,
  generateListingSeoMeta,
  rewriteListingDescription,
  rewriteListingServices,
  saveDirectoryListing,
  submitDirectoryListingForReview,
  translateListingContent,
  type AutoCreatedListingDetails,
  type ListingFormField,
  type ListingFormValues,
} from "@/app/actions/directory";
import { Button, buttonClasses } from "@/components/ui/button";
import { FieldGroup, Input, Label, RequiredMark, Select, Textarea } from "@/components/ui/field";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { AiAutoCreatePanel } from "@/components/directory/ai-auto-create-panel";
import { FaqEditor } from "@/components/directory/faq-editor";
import { ListingLogo } from "@/components/directory/listing-logo";
import { MarkdownLiteEditor } from "@/components/directory/markdown-lite-editor";
import { OperatingHoursEditor } from "@/components/directory/operating-hours-editor";
import { PartnerSlugForm } from "@/components/directory/partner-slug-form";
import { ServicesEditor } from "@/components/directory/services-editor";
import { useToast } from "@/components/ui/toast";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { PartnerListingStatus } from "@/generated/prisma/client";
import type { OperatingHours } from "@/lib/operating-hours";
import type { FaqEntry, ListingTranslations, ServiceEntry } from "@/lib/directory";

type TranslationLocale = "zh" | "ms";
type EditorTab = "en" | TranslationLocale;

// Which language's Tagline/About/Products & services/FAQ the editor is
// currently showing — Company name, Website, Industry, Business
// categories, Address, Operating hours, and Search & social preview aren't
// part of this switch: they're single fields shared across every language,
// never duplicated per tab.
const LANGUAGE_TABS: { code: EditorTab; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
  { code: "ms", label: "BM" },
];

// The other two AI actions (description rewrite, SEO meta) just want a
// readable summary of what services exist for grounding — not the
// structured list itself, which rewriteListingServices below handles on
// its own terms.
function servicesContextText(services: ServiceEntry[]): string {
  return services
    .filter((service) => service.title.trim())
    .map((service) => (service.description ? `${service.title} — ${service.description}` : service.title))
    .join("\n");
}

const LISTING_FORM_ID = "partner-listing-form";

export function PartnerListingForm({
  listingId,
  values,
  logoUrl,
  operatingHours,
  status,
  aiAvailable,
  placesAvailable,
  categories,
  slug,
  siteOrigin,
}: {
  listingId: string;
  values: ListingFormValues;
  logoUrl: string | null;
  operatingHours: OperatingHours | null;
  status: PartnerListingStatus;
  aiAvailable: boolean;
  placesAvailable: boolean;
  categories: { id: string; name: string }[];
  slug: string;
  siteOrigin: string;
}) {
  const [state, formAction, pending] = useActionState(saveDirectoryListing.bind(null, listingId), undefined);
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
  // True right after a successful "Save draft" — greys the button out and
  // swaps its label to "Saved" so a click clearly did something, until the
  // next edit (see the form's onChange below) or resubmit makes it stale.
  const [justSaved, setJustSaved] = useState(false);
  const [lastSyncedState, setLastSyncedState] = useState(state);
  if (state !== lastSyncedState) {
    setLastSyncedState(state);
    if (state && "error" in state) {
      setDisplayError({ error: state.error, field: state.field });
      setJustSaved(false);
    } else if (state && "success" in state) {
      setDisplayError(null);
      setJustSaved(true);
    }
  }
  const companyNameError = displayError?.field === "companyName" ? displayError.error : null;
  const servicesError = displayError?.field === "services" ? displayError.error : null;
  const generalError = displayError && !displayError.field ? displayError.error : null;

  // The render-phase sync above only updates React state (the documented
  // exception to "don't setState during render") — the toast itself is a
  // real side effect, so it belongs in an effect keyed on `state`, not
  // alongside that sync, or a double-render (e.g. Strict Mode) could fire
  // it twice.
  useEffect(() => {
    if (state && "success" in state) toast.success("Draft saved.");
  }, [state, toast]);

  // Company name stays a plain defaultValue input (unchanged below) — it's
  // only grounding context for the AI actions, never written by one, so
  // reading it live off the form via FormData when needed is enough. Every
  // field AI Auto Create can fill in (see handleAutoCreated) is controlled
  // state instead, so one result can land in all of them at once.
  const formRef = useRef<HTMLFormElement>(null);
  const [tagline, setTagline] = useState(current.tagline);
  const [website, setWebsite] = useState(current.website);
  const [industry, setIndustry] = useState(current.industry);
  const [address, setAddress] = useState(current.address);
  const [categoryIds, setCategoryIds] = useState<string[]>(current.categoryIds);
  const [description, setDescription] = useState(current.description);
  const [services, setServices] = useState<ServiceEntry[]>(current.services);
  const [faqs, setFaqs] = useState<FaqEntry[]>(current.faqs);
  // OperatingHoursEditor seeds its own per-day state from initialHours once,
  // on mount — bumping the key remounts it so a fresh set of hours from AI
  // Auto Create actually shows, instead of being ignored as a prop change.
  const [hours, setHours] = useState(operatingHours);
  const [hoursKey, setHoursKey] = useState(0);
  const [seoTitle, setSeoTitle] = useState(current.seoTitle);
  const [seoDescription, setSeoDescription] = useState(current.seoDescription);
  const [translations, setTranslations] = useState<ListingTranslations>(current.translations);
  const [activeTab, setActiveTab] = useState<EditorTab>("en");
  const [rewritingDescription, startRewriteDescription] = useTransition();
  const [rewritingServices, startRewriteServices] = useTransition();
  const [generatingFaqs, startGenerateFaqs] = useTransition();
  const [generatingSeoMeta, startGenerateSeoMeta] = useTransition();
  const [translating, startTranslate] = useTransition();

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
      const result = await submitDirectoryListingForReview(listingId, undefined, formData);
      if (result && "error" in result) {
        setDisplayError({ error: result.error, field: result.field });
      } else {
        setDisplayError(null);
        toast.success(
          result?.published ? "Published — your listing is now live." : "Submitted — an admin will review it shortly.",
        );
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
      const result = await rewriteListingDescription(description, { ...context, services: servicesContextText(services) });
      if (result.status === "ok") {
        setDescription(result.data.text);
        setJustSaved(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleRewriteServices() {
    const context = contextFromForm();
    startRewriteServices(async () => {
      const result = await rewriteListingServices(
        services.map(({ title, description: serviceDescription }) => ({ title, description: serviceDescription })),
        { ...context, description },
      );
      if (result.status === "ok") {
        setServices(
          result.data.services.map((entry, i) => ({
            title: entry.title,
            description: entry.description,
            price: services[i]?.price ?? "",
          })),
        );
        setJustSaved(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleGenerateFaqs() {
    const context = contextFromForm();
    startGenerateFaqs(async () => {
      const result = await generateListingFaqs(faqs, { ...context, description, services: servicesContextText(services) });
      if (result.status === "ok") {
        setFaqs(result.data.faqs.map((entry) => ({ question: entry.question, answer: entry.answer })));
        setJustSaved(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleGenerateSeoMeta() {
    const context = contextFromForm();
    startGenerateSeoMeta(async () => {
      const result = await generateListingSeoMeta(
        { title: seoTitle, description: seoDescription },
        { ...context, description, services: servicesContextText(services) },
      );
      if (result.status === "ok") {
        setSeoTitle(result.data.title);
        setSeoDescription(result.data.description);
        setJustSaved(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  function emptyTranslationEntry(prev: ListingTranslations, locale: TranslationLocale) {
    return {
      tagline: prev[locale]?.tagline ?? "",
      description: prev[locale]?.description ?? "",
      services: prev[locale]?.services ?? [],
      faqs: prev[locale]?.faqs ?? [],
    };
  }

  function updateTranslation(locale: TranslationLocale, field: "tagline" | "description", value: string) {
    setTranslations((prev) => ({ ...prev, [locale]: { ...emptyTranslationEntry(prev, locale), [field]: value } }));
    setJustSaved(false);
  }

  function updateTranslatedServices(locale: TranslationLocale, newServices: ServiceEntry[]) {
    setTranslations((prev) => ({ ...prev, [locale]: { ...emptyTranslationEntry(prev, locale), services: newServices } }));
    setJustSaved(false);
  }

  function updateTranslatedFaqs(locale: TranslationLocale, newFaqs: FaqEntry[]) {
    setTranslations((prev) => ({ ...prev, [locale]: { ...emptyTranslationEntry(prev, locale), faqs: newFaqs } }));
    setJustSaved(false);
  }

  // Translates the primary tagline/description/services/faqs together, into
  // both target languages at once — unlike the rewrite/generate actions
  // above there's no existing translation to "improve"; the English fields
  // are always the source of truth, so every call starts fresh from them.
  // Services come back title/description only (see translateListingContent)
  // — each entry's price is re-attached by index right after, same as
  // handleRewriteServices does for the English list.
  function handleTranslate() {
    const formData = new FormData(formRef.current ?? undefined);
    const tagline = String(formData.get("tagline") || "");
    startTranslate(async () => {
      const result = await translateListingContent({
        tagline,
        description,
        services: services.map(({ title, description: serviceDescription }) => ({ title, description: serviceDescription })),
        faqs: faqs.map(({ question, answer }) => ({ question, answer })),
      });
      if (result.status === "ok") {
        const attachPrices = (translated: { title: string; description: string }[]) =>
          translated.map((entry, i) => ({ ...entry, price: services[i]?.price ?? "" }));
        setTranslations({
          zh: { ...result.data.zh, services: attachPrices(result.data.zh.services) },
          ms: { ...result.data.ms, services: attachPrices(result.data.ms.services) },
        });
        setJustSaved(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  // Only fields the draft actually has something for are replaced — a
  // Google listing with no hours, say, leaves hours the partner already set
  // alone rather than wiping them.
  function handleAutoCreated(details: AutoCreatedListingDetails) {
    if (details.tagline) setTagline(details.tagline);
    if (details.description) setDescription(details.description);
    if (details.industry) setIndustry(details.industry);
    if (details.categoryIds.length > 0) setCategoryIds(details.categoryIds);
    if (details.services.length > 0) setServices(details.services);
    if (details.faqs.length > 0) setFaqs(details.faqs);
    if (details.website) setWebsite(details.website);
    if (details.address) setAddress(details.address);
    if (details.operatingHours) {
      setHours(details.operatingHours);
      setHoursKey((key) => key + 1);
    }
    setActiveTab("en");
    setJustSaved(false);
  }

  return (
    <>
      {/* Public URL and AI Auto Create sit side by side as the editor's
          first row. PartnerSlugForm is its own independent <form> (a
          separate server action from the listing form below), so it can't
          nest inside the listing <form> — it's rendered here as a sibling
          instead. AiAutoCreatePanel isn't a form itself, but its Website
          field submits as part of the listing form via the `form`
          attribute (see LISTING_FORM_ID) since it now lives outside that
          form's DOM subtree too. */}
      <div className={cn("mb-5 grid items-start gap-6", aiAvailable && "lg:grid-cols-2")}>
        <div className="rounded-md border border-slate-200 p-4 dark:border-neutral-800">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Public URL</h3>
          <PartnerSlugForm listingId={listingId} slug={slug} siteOrigin={siteOrigin} />
        </div>

        {aiAvailable && (
          <AiAutoCreatePanel
            formId={LISTING_FORM_ID}
            placesAvailable={placesAvailable}
            defaultQuery={current.companyName}
            website={website}
            onWebsiteChange={(site) => {
              setWebsite(site);
              setJustSaved(false);
            }}
            getContext={() => ({ companyName: contextFromForm().companyName })}
            onCreated={handleAutoCreated}
          />
        )}
      </div>

      <form
        id={LISTING_FORM_ID}
        ref={formRef}
        action={formAction}
        className="space-y-5"
        // Native change/input events bubble here from any plain field the
        // visitor edits after a save — the signal that "Saved" is stale, so
        // the button re-enables. Content that changes without a native event
        // (an AI rewrite/translate/generate/auto-create response, or a
        // MarkdownLiteEditor toolbar click, both of which just call a setState
        // setter directly) clears it explicitly at the point of change instead
        // — see handleRewriteDescription and friends, handleAutoCreated, and
        // updateTranslation/updateTranslatedServices/updateTranslatedFaqs
        // above. Doesn't catch every custom widget's own button clicks
        // (categories, FAQ/service row add-remove), but those are rare to
        // touch alone without also editing a plain field nearby.
        onChange={() => setJustSaved(false)}
      >

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

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 p-2 dark:border-neutral-800">
        <div className="inline-flex rounded-md bg-slate-100 p-0.5 dark:bg-neutral-800">
          {LANGUAGE_TABS.map((tab) => (
            <button
              key={tab.code}
              type="button"
              onClick={() => setActiveTab(tab.code)}
              aria-pressed={activeTab === tab.code}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab.code
                  ? "bg-white text-petrol-ink shadow-sm dark:bg-neutral-700 dark:text-petrol-light"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {aiAvailable && (
          <button
            type="button"
            onClick={handleTranslate}
            disabled={translating}
            className={buttonClasses("ghost", "sm", "shrink-0")}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {translating ? "Translating…" : "Translate with AI"}
          </button>
        )}
      </div>
      <p className="-mt-3 text-xs text-slate-400">
        Tagline, About, Products &amp; services, and FAQ are per-language — switch tabs to edit each, or use
        Translate with AI to fill in Chinese and Malay from your English content. Everything else (company name,
        industry, categories, hours, and more) applies to all languages.
      </p>

      {/* Website is normally a field inside AiAutoCreatePanel above (it's
          both the source and the target of that section's auto-fill) — this
          is only the fallback when AI isn't configured at all and that
          panel doesn't render, so the field still needs to exist somewhere. */}
      <div className={cn("grid gap-4", aiAvailable ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
        <FieldGroup label="Company name" htmlFor="companyName" required>
          <Input id="companyName" name="companyName" required defaultValue={current.companyName} />
          {companyNameError && <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{companyNameError}</p>}
        </FieldGroup>

        <div hidden={activeTab !== "en"}>
          <FieldGroup label="Tagline" htmlFor="tagline">
            <Input
              id="tagline"
              name="tagline"
              value={tagline}
              onChange={(event) => setTagline(event.target.value)}
              placeholder="One line under your company name"
              maxLength={140}
            />
          </FieldGroup>
        </div>
        <div hidden={activeTab !== "zh"}>
          <FieldGroup label="Tagline" htmlFor="zhTagline">
            <Input
              id="zhTagline"
              name="zhTagline"
              value={translations.zh?.tagline ?? ""}
              onChange={(event) => updateTranslation("zh", "tagline", event.target.value)}
              maxLength={140}
            />
          </FieldGroup>
        </div>
        <div hidden={activeTab !== "ms"}>
          <FieldGroup label="Tagline" htmlFor="msTagline">
            <Input
              id="msTagline"
              name="msTagline"
              value={translations.ms?.tagline ?? ""}
              onChange={(event) => updateTranslation("ms", "tagline", event.target.value)}
              maxLength={140}
            />
          </FieldGroup>
        </div>

        {!aiAvailable && (
          <FieldGroup label="Website" htmlFor="website">
            <Input
              id="website"
              name="website"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="acme.com"
            />
          </FieldGroup>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Industry" htmlFor="industry">
          <Select
            id="industry"
            name="industry"
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
            className="h-12 text-base font-medium"
          >
            <option value="">Not set</option>
            {INDUSTRIES.map((code) => (
              <option key={code} value={code}>
                {INDUSTRY_LABELS[code]}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup label="Business categories" htmlFor="categoryIds">
          {categories.length === 0 ? (
            <p className="text-sm text-slate-400">No categories yet.</p>
          ) : (
            <MultiCombobox
              id="categoryIds"
              name="categoryIds"
              options={categories.map((category) => ({ value: category.id, label: category.name }))}
              value={categoryIds}
              onValueChange={setCategoryIds}
              placeholder="Search categories…"
              emptyMessage="No matching categories"
              size="lg"
            />
          )}
          <p className="mt-1 text-xs text-slate-400">Optional — helps visitors filter the directory by what you do.</p>
        </FieldGroup>
      </div>

      <FieldGroup label="Address" htmlFor="address">
        <Textarea
          id="address"
          name="address"
          rows={2}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder={"123 Jalan Bukit Bintang\n50200 Kuala Lumpur, Malaysia"}
        />
        <p className="mt-1 text-xs text-slate-400">Shown on your listing with a map. Leave blank to skip the map.</p>
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <div hidden={activeTab !== "en"}>
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
            listingId={listingId}
            rows={5}
            value={description}
            onChange={(value) => {
              setDescription(value);
              setJustSaved(false);
            }}
            placeholder="What does your business do?"
          />
          <p className="mt-1 text-xs text-slate-400">
            Select text and use the toolbar for <strong>bold</strong>, lists, links, and images — or switch to
            Preview to see how it&apos;ll look.
          </p>
        </div>
        <div hidden={activeTab !== "zh"}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <Label htmlFor="zhDescription" className="mb-0">
              About
            </Label>
          </div>
          <MarkdownLiteEditor
            id="zhDescription"
            name="zhDescription"
            listingId={listingId}
            rows={5}
            value={translations.zh?.description ?? ""}
            onChange={(value) => updateTranslation("zh", "description", value)}
            placeholder="What does your business do?"
          />
          <p className="mt-1 text-xs text-slate-400">
            Select text and use the toolbar for <strong>bold</strong>, lists, links, and images — or switch to
            Preview to see how it&apos;ll look.
          </p>
        </div>
        <div hidden={activeTab !== "ms"}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <Label htmlFor="msDescription" className="mb-0">
              About
            </Label>
          </div>
          <MarkdownLiteEditor
            id="msDescription"
            name="msDescription"
            listingId={listingId}
            rows={5}
            value={translations.ms?.description ?? ""}
            onChange={(value) => updateTranslation("ms", "description", value)}
            placeholder="What does your business do?"
          />
          <p className="mt-1 text-xs text-slate-400">
            Select text and use the toolbar for <strong>bold</strong>, lists, links, and images — or switch to
            Preview to see how it&apos;ll look.
          </p>
        </div>

        <div>
          <Label>Operating hours</Label>
          <OperatingHoursEditor key={hoursKey} initialHours={hours} />
          <p className="mt-1 text-xs text-slate-400">Shown on your listing exactly as set here.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <Label className="mb-0">
              Products &amp; services
              <RequiredMark />
            </Label>
            {aiAvailable && activeTab === "en" && (
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
          <div hidden={activeTab !== "en"}>
            <ServicesEditor name="services" value={services} onChange={setServices} />
          </div>
          <div hidden={activeTab !== "zh"}>
            <ServicesEditor
              name="zhServices"
              value={translations.zh?.services ?? []}
              onChange={(value) => updateTranslatedServices("zh", value)}
            />
          </div>
          <div hidden={activeTab !== "ms"}>
            <ServicesEditor
              name="msServices"
              value={translations.ms?.services ?? []}
              onChange={(value) => updateTranslatedServices("ms", value)}
            />
          </div>
          {servicesError ? (
            <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{servicesError}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-400">
              A title, an optional description, and an optional price for each — shown on your listing. At least one
              is required (in English) before you can submit for review.
            </p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <Label className="mb-0">FAQ</Label>
            {aiAvailable && activeTab === "en" && (
              <button
                type="button"
                onClick={handleGenerateFaqs}
                disabled={generatingFaqs}
                className={buttonClasses("ghost", "sm", "shrink-0")}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {generatingFaqs ? "Generating…" : "Generate with AI"}
              </button>
            )}
          </div>
          <div hidden={activeTab !== "en"}>
            <FaqEditor name="faqs" value={faqs} onChange={setFaqs} />
          </div>
          <div hidden={activeTab !== "zh"}>
            <FaqEditor name="zhFaqs" value={translations.zh?.faqs ?? []} onChange={(value) => updateTranslatedFaqs("zh", value)} />
          </div>
          <div hidden={activeTab !== "ms"}>
            <FaqEditor name="msFaqs" value={translations.ms?.faqs ?? []} onChange={(value) => updateTranslatedFaqs("ms", value)} />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Optional — shown on your listing as a Q&amp;A section, and helps your page surface in AI search answers.
          </p>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <Label className="mb-0">Search &amp; social preview</Label>
          {aiAvailable && (
            <button
              type="button"
              onClick={handleGenerateSeoMeta}
              disabled={generatingSeoMeta}
              className={buttonClasses("ghost", "sm", "shrink-0")}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {generatingSeoMeta ? "Generating…" : "Generate with AI"}
            </button>
          )}
        </div>
        <div className="space-y-3 rounded-md border border-slate-200 p-3 dark:border-neutral-800">
          <FieldGroup label="SEO title" htmlFor="seoTitle">
            <Input
              id="seoTitle"
              name="seoTitle"
              value={seoTitle}
              onChange={(event) => setSeoTitle(event.target.value)}
              placeholder={`${current.companyName || "Your company"} | Business Directory`}
              maxLength={100}
            />
          </FieldGroup>
          <FieldGroup label="SEO description" htmlFor="seoDescription">
            <Textarea
              id="seoDescription"
              name="seoDescription"
              rows={2}
              value={seoDescription}
              onChange={(event) => setSeoDescription(event.target.value)}
              placeholder="Shown in search results and when your link is shared — one or two sentences."
              maxLength={300}
            />
          </FieldGroup>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Optional — leave blank to use your tagline and About text automatically.
        </p>
      </div>

      {generalError && <p className="text-sm text-rose-600 dark:text-rose-400">{generalError}</p>}

      {/* Sticky rather than plain-flow — this is a long form (translations,
          services, FAQ...), and Save/Submit staying reachable without
          scrolling all the way down matters most on mobile. Bleeds out of
          CardBody's own -mx-5/px-5 padding so the bar spans the card's full
          width; stops sticking once its own bottom (the card's) scrolls
          past the viewport, same as any sticky element. */}
      <div className="sticky bottom-0 -mx-5 -mb-4 flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-5 py-3 dark:border-neutral-800 dark:bg-neutral-900">
        <Button
          type="submit"
          disabled={pending || justSaved}
          variant={justSaved ? "secondary" : "primary"}
          className={justSaved ? undefined : "bg-led text-led-ink hover:bg-led-hover active:bg-led-active focus-visible:ring-led"}
        >
          {pending ? "Saving…" : justSaved ? "Saved" : "Save draft"}
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
    </>
  );
}

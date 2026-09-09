"use client";

import { useActionState, useState } from "react";
import { submitDirectoryLead } from "@/app/actions/directory";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";
import { useInquiry } from "@/components/directory/listing-inquiry";
import { DIRECTORY_STRINGS, type DirectoryLocale } from "@/lib/directory-i18n";

// Same honeypot/render-timing shape as the CRM's own public lead form (see
// LeadCaptureForm) — this is exactly as exposed to the open internet.
export function DirectoryLeadForm({ slug, locale }: { slug: string; locale: DirectoryLocale }) {
  const [state, formAction, pending] = useActionState(submitDirectoryLead, undefined);
  const t = DIRECTORY_STRINGS[locale];

  // Controlled, so a validation error clears only what's actually wrong —
  // React resets uncontrolled inputs back to empty once the action
  // resolves, success or not.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [renderedAt] = useState(() => Date.now());

  // Clicking one or more products/services (see ServiceList) sets this,
  // which prefills the message here instead of leaving a visitor to type
  // out what they're asking about — see InquiryProvider for the shared
  // click state. The message is fully regenerated from the current
  // selection on every change (one line for a single pick, a bulleted list
  // for several, cleared back to empty once nothing's picked) rather than
  // trying to preserve anything a visitor typed alongside it — simpler and
  // more predictable than partially patching hand-typed free text. Updating
  // `message` during render (comparing against the last-seen selection)
  // rather than in an effect is React's own documented way to sync state to
  // a changed prop/context value without an extra render round-trip — same
  // pattern partner-listing-form.tsx uses for its own display state.
  const { selectedServices } = useInquiry();
  const [lastSelectedServices, setLastSelectedServices] = useState(selectedServices);
  if (selectedServices !== lastSelectedServices) {
    setLastSelectedServices(selectedServices);
    if (selectedServices.length === 0) {
      setMessage("");
    } else if (selectedServices.length === 1) {
      setMessage(`I'm interested in: ${selectedServices[0]}. `);
    } else {
      setMessage(`I'm interested in:\n${selectedServices.map((title) => `- ${title}`).join("\n")}\n`);
    }
  }

  if (state?.status === "success") {
    return (
      <p className="rounded-md bg-emerald-50 px-4 py-3 text-center text-base font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
        {t.formSuccess}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      {/* The page's own URL already carries the locale (see
          src/app/[locale]/directory/[slug]/page.tsx) — more reliable than
          the directory_locale cookie submitDirectoryLead used to fall back
          on, which can lag behind (e.g. a visitor who followed a direct
          /zh/... link without ever using the language switcher). */}
      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot: hidden from real visitors, often filled in by bots. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="directory-website">Leave this field blank</label>
        <input id="directory-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input type="hidden" name="renderedAt" value={renderedAt} />

      <FieldGroup label={t.formNameLabel} htmlFor="directory-name" required>
        <Input
          id="directory-name"
          name="name"
          required
          placeholder={t.formNamePlaceholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="text-base"
        />
      </FieldGroup>
      <FieldGroup label={t.formEmailLabel} htmlFor="directory-email" required>
        <Input
          id="directory-email"
          name="email"
          type="email"
          required
          placeholder={t.formEmailPlaceholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="text-base"
        />
      </FieldGroup>
      <FieldGroup label={t.formPhoneLabel} htmlFor="directory-phone" required>
        <Input
          id="directory-phone"
          name="phone"
          type="tel"
          required
          placeholder={t.formPhonePlaceholder}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="text-base"
        />
        <p className="mt-1 text-xs text-slate-400">{t.formPhoneHint}</p>
      </FieldGroup>
      <FieldGroup label={t.formCompanyLabel} htmlFor="directory-company">
        <Input
          id="directory-company"
          name="company"
          placeholder={t.formCompanyPlaceholder}
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          className="text-base"
        />
      </FieldGroup>
      <FieldGroup label={t.formMessageLabel} htmlFor="directory-message" required>
        <Textarea
          id="directory-message"
          name="message"
          rows={4}
          required
          placeholder={t.formMessagePlaceholder}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="text-base"
        />
      </FieldGroup>

      {state?.status === "error" && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{t.errors[state.code]}</p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full bg-led text-base text-led-ink hover:bg-led-hover active:bg-led-active focus-visible:ring-led"
      >
        {pending ? t.formSubmitting : t.formSubmit}
      </Button>
    </form>
  );
}

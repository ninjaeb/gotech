"use client";

import { useActionState, useState } from "react";
import { submitDirectoryLead } from "@/app/actions/directory";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";
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

  if (state?.status === "success") {
    return (
      <p className="rounded-md bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
        {t.formSuccess}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
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
        />
      </FieldGroup>

      {state?.status === "error" && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{t.errors[state.code]}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.formSubmitting : t.formSubmit}
      </Button>
    </form>
  );
}

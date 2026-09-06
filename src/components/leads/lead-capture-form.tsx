"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { submitLead } from "@/app/actions/leads";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  getLeadFormLocaleSnapshot,
  getServerLeadFormLocaleSnapshot,
  LEAD_FORM_LOCALES,
  LEAD_FORM_STRINGS,
  setLeadFormLocale,
  subscribeLeadFormLocale,
} from "@/lib/lead-form-i18n";

export function LeadCaptureForm() {
  const [state, formAction, pending] = useActionState(submitLead, undefined);

  // localStorage isn't available during the server render, so the server
  // snapshot is always the default; React re-checks the real snapshot right
  // after hydration and re-renders if the visitor had picked something else
  // on a previous visit.
  const lang = useSyncExternalStore(
    subscribeLeadFormLocale,
    getLeadFormLocaleSnapshot,
    getServerLeadFormLocaleSnapshot,
  );

  const t = LEAD_FORM_STRINGS[lang];

  // Controlled fields, deliberately — React clears every uncontrolled
  // input back to empty once a Server Action dispatched from this form
  // resolves, success OR error. Without this, a validation failure (e.g.
  // a badly-formatted phone number) would wipe out everything else the
  // visitor already typed, not just the one field that's wrong.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [message, setMessage] = useState("");

  // Set once at mount, unaffected by a later language switch (that's a
  // re-render, not a re-mount) — the server rejects a submission that
  // arrives less than MIN_FILL_MS after this, since no human reads the
  // form and types an answer that fast. See lead-spam-guard.ts.
  const [renderedAt] = useState(() => Date.now());

  const languageSwitcher = (
    <div className="mb-4 flex justify-end gap-1">
      {LEAD_FORM_LOCALES.map((option) => (
        <button
          key={option.code}
          type="button"
          onClick={() => setLeadFormLocale(option.code)}
          aria-pressed={lang === option.code}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
            lang === option.code
              ? "bg-indigo-600 text-white"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-neutral-800",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  if (state?.status === "success") {
    return (
      <div>
        {languageSwitcher}
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          {t.success}
        </p>
      </div>
    );
  }

  return (
    <div>
      {languageSwitcher}
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t.heading}</h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{t.subheading}</p>

      <form action={formAction} className="space-y-4">
        {/* Honeypot: hidden from real visitors, often filled in by bots. */}
        <div className="absolute left-[-9999px]" aria-hidden="true">
          <label htmlFor="website">Leave this field blank</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <input type="hidden" name="renderedAt" value={renderedAt} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup label={t.nameLabel} htmlFor="name" required>
            <Input
              id="name"
              name="name"
              required
              placeholder={t.namePlaceholder}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </FieldGroup>
          <FieldGroup label={t.phoneLabel} htmlFor="phone" required>
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              placeholder={t.phonePlaceholder}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">{t.phoneHint}</p>
          </FieldGroup>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup label={t.emailLabel} htmlFor="email" required>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FieldGroup>
          <FieldGroup label={t.companyLabel} htmlFor="companyName">
            <Input
              id="companyName"
              name="companyName"
              placeholder={t.companyPlaceholder}
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
            />
          </FieldGroup>
        </div>
        <FieldGroup label={t.messageLabel} htmlFor="message">
          <Textarea
            id="message"
            name="message"
            rows={4}
            placeholder={t.messagePlaceholder}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </FieldGroup>

        {state?.status === "error" && (
          <p className="text-sm text-rose-600 dark:text-rose-400">{t.errors[state.code]}</p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t.submitting : t.submit}
        </Button>
      </form>
    </div>
  );
}

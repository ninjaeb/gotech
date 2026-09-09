"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUpPartner, type PartnerSignupState } from "@/app/actions/partner-signup";
import { Button, buttonClasses } from "@/components/ui/button";
import { FieldGroup, Input } from "@/components/ui/field";
import { GoogleIcon } from "@/components/directory/google-icon";
import type { DirectoryStrings, PartnerSignupErrorCode } from "@/lib/directory-i18n";

export function PartnerSignupForm({
  t,
  googleEnabled,
  initialError,
}: {
  t: DirectoryStrings;
  googleEnabled: boolean;
  initialError?: string;
}) {
  const [state, formAction, pending] = useActionState<PartnerSignupState, FormData>(signUpPartner, undefined);

  // Controlled, same reasoning as LeadCaptureForm — and here they double as
  // the hidden fields the Google button's own form submits, so whatever the
  // visitor already typed survives the full-page redirect to Google.
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [renderedAt] = useState(() => Date.now());

  const errorCode: PartnerSignupErrorCode | undefined =
    state?.status === "error"
      ? state.code
      : initialError && initialError in t.signupErrors
        ? (initialError as PartnerSignupErrorCode)
        : undefined;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t.signupHeading}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.signupSubheading}</p>

      {googleEnabled && (
        <>
          <form action="/api/auth/google" method="POST" className="mt-6">
            <input type="hidden" name="companyName" value={companyName} />
            <input type="hidden" name="contactName" value={contactName} />
            <input type="hidden" name="phone" value={phone} />
            <button type="submit" className={buttonClasses("secondary", "md", "w-full")}>
              <GoogleIcon className="h-4 w-4" />
              {t.signupGoogleCta}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-neutral-800" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{t.signupOrDivider}</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-neutral-800" />
          </div>
        </>
      )}

      <form action={formAction} className={googleEnabled ? "space-y-4" : "mt-6 space-y-4"}>
        {/* Honeypot: same pattern as LeadCaptureForm — real visitors never see or fill it. */}
        <div className="absolute left-[-9999px]" aria-hidden="true">
          <label htmlFor="website">Leave this field blank</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <input type="hidden" name="renderedAt" value={renderedAt} />

        <FieldGroup label={t.signupCompanyLabel} htmlFor="companyName" required>
          <Input
            id="companyName"
            name="companyName"
            required
            placeholder={t.signupCompanyPlaceholder}
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
        </FieldGroup>
        <FieldGroup label={t.signupNameLabel} htmlFor="contactName" required>
          <Input
            id="contactName"
            name="contactName"
            required
            placeholder={t.signupNamePlaceholder}
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
          />
        </FieldGroup>
        <FieldGroup label={t.signupEmailLabel} htmlFor="email" required>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t.signupEmailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FieldGroup>
        <FieldGroup label={t.signupPhoneLabel} htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder={t.signupPhonePlaceholder}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <p className="mt-1 text-xs text-slate-400">{t.signupPhoneHint}</p>
        </FieldGroup>
        <FieldGroup label={t.signupPasswordLabel} htmlFor="password" required>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="mt-1 text-xs text-slate-400">{t.signupPasswordHint}</p>
        </FieldGroup>

        {errorCode && <p className="text-sm text-rose-600 dark:text-rose-400">{t.signupErrors[errorCode]}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t.signupSubmitting : t.signupSubmit}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {t.signupAlreadyPartner}{" "}
        <Link href="/business/login" className="text-petrol hover:underline dark:text-petrol-light">
          {t.signupSignInLink}
        </Link>
      </p>
    </div>
  );
}

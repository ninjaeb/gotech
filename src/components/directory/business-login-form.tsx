"use client";

import Link from "next/link";
import { useActionState } from "react";
import { businessLogin } from "@/app/actions/auth";
import { Button, buttonClasses } from "@/components/ui/button";
import { FieldGroup, Input } from "@/components/ui/field";
import { GoogleIcon } from "@/components/directory/google-icon";
import { directorySignupPath, type DirectoryLocale } from "@/lib/directory-i18n";

// The business portal's own front door — same template as
// partner-signup-form.tsx (heading + optional Google button + divider +
// form, no card, no separate icon/wordmark since DirectoryChrome's header
// already shows one) so a partner moving between "list your business" and
// "sign in" never feels like they've left the site. Separate from the
// CRM's /system/login (businessLogin rejects a staff account's password
// just as login() rejects a business one, see src/app/actions/auth.ts), so
// a partner never lands on staff-branded chrome and vice versa. The Google
// button posts to the same /api/auth/google flow the signup page uses
// (registerOrSignInPartnerWithGoogle signs an existing PARTNER straight in,
// creates a new one on the fly, and rejects a staff account's Google login
// the same way businessLogin rejects its password), so this one button
// covers both "log me in" and "I don't have an account yet" without a
// separate form.
export function BusinessLoginForm({
  googleEnabled,
  initialError,
  locale,
}: {
  googleEnabled: boolean;
  initialError?: string;
  locale: DirectoryLocale;
}) {
  const [state, formAction, pending] = useActionState(businessLogin, undefined);
  const error = state?.error ?? initialError;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Sign in to your business</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Manage your listing and directory leads.
      </p>

      {googleEnabled && (
        <>
          <form action="/api/auth/google" method="POST" className="mt-6">
            <input type="hidden" name="returnTo" value="login" />
            <button type="submit" className={buttonClasses("secondary", "md", "w-full")}>
              <GoogleIcon className="h-4 w-4" />
              Continue with Google
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-neutral-800" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-neutral-800" />
          </div>
        </>
      )}

      <form action={formAction} className={googleEnabled ? "space-y-4" : "mt-6 space-y-4"}>
        <FieldGroup label="Email" htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </FieldGroup>
        <FieldGroup label="Password" htmlFor="password" required>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </FieldGroup>

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        New business?{" "}
        <Link href={directorySignupPath(locale)} className="text-petrol hover:underline dark:text-petrol-light">
          Create an account
        </Link>
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { businessLogin } from "@/app/actions/auth";
import { Card, CardBody } from "@/components/ui/card";
import { Label, Input, RequiredMark } from "@/components/ui/field";
import { Button, buttonClasses } from "@/components/ui/button";
import { GoogleIcon } from "@/components/directory/google-icon";

// The business portal's own front door — separate from the CRM's
// /system/login (businessLogin rejects a staff account's password just as
// login() rejects a business one, see src/app/actions/auth.ts), so a
// partner never lands on staff-branded chrome and vice versa. The Google
// button posts to the same /api/auth/google flow the signup page uses
// (registerOrSignInPartnerWithGoogle signs an existing account straight in
// and creates a new one on the fly), so this one button covers both
// "log me in" and "I don't have an account yet" without a separate form.
export function BusinessLoginForm({
  googleEnabled,
  initialError,
}: {
  googleEnabled: boolean;
  initialError?: string;
}) {
  const [state, formAction, pending] = useActionState(businessLogin, undefined);
  const error = state?.error ?? initialError;

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center gap-2">
        <img src="/icon-192.png" alt="" className="h-10 w-10 shrink-0" />
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Gotka business portal</h1>
      </div>

      <Card>
        <CardBody>
          {googleEnabled && (
            <>
              <form action="/api/auth/google" method="POST">
                <input type="hidden" name="returnTo" value="login" />
                <button type="submit" className={buttonClasses("secondary", "md", "w-full")}>
                  <GoogleIcon className="h-4 w-4" />
                  Continue with Google
                </button>
              </form>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-neutral-800" />
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-neutral-800" />
              </div>
            </>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="email">
                Email
                <RequiredMark />
              </Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div>
              <Label htmlFor="password">
                Password
                <RequiredMark />
              </Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardBody>
      </Card>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        New business?{" "}
        <Link href="/directory/signup" className="text-petrol hover:underline dark:text-petrol-light">
          Create an account
        </Link>
      </p>
    </div>
  );
}

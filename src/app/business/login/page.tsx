"use client";

import Link from "next/link";
import { useActionState } from "react";
import { businessLogin } from "@/app/actions/auth";
import { Card, CardBody } from "@/components/ui/card";
import { Label, Input, RequiredMark } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

// The business portal's own front door — separate from the CRM's
// /system/login (businessLogin rejects a staff account's password just as
// login() rejects a business one, see src/app/actions/auth.ts), so a
// partner never lands on staff-branded chrome and vice versa.
export default function BusinessLoginPage() {
  const [state, formAction, pending] = useActionState(businessLogin, undefined);

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <img src="/icon-192.png" alt="" className="h-10 w-10 shrink-0" />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Gotka business portal</h1>
        </div>

        <Card>
          <CardBody>
            <form action={formAction} className="space-y-4">
              <div>
                <Label htmlFor="email">
                  Email
                  <RequiredMark />
                </Label>
                <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
              </div>
              <div>
                <Label htmlFor="password">
                  Password
                  <RequiredMark />
                </Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              {state?.error && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          New business?{" "}
          <Link href="/directory/signup" className="text-petrol hover:underline dark:text-petrol-light">
            List yours
          </Link>
        </p>
      </div>
    </div>
  );
}

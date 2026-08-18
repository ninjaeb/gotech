"use client";

import { useActionState } from "react";
import { portalLogin } from "@/app/actions/portal-auth";
import { Card, CardBody } from "@/components/ui/card";
import { Label, Input, RequiredMark } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export default function PortalLoginPage() {
  const [state, formAction, pending] = useActionState(portalLogin, undefined);

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600 text-base font-bold text-white">
            G
          </div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Client Portal
          </h1>
        </div>

        <Card>
          <CardBody>
            <form action={formAction} className="space-y-4">
              <div>
                <Label htmlFor="email">
                  Email
                  <RequiredMark />
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="password">
                  Password
                  <RequiredMark />
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              {state?.error && (
                <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>
              )}
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

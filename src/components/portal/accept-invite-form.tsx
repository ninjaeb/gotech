"use client";

import { useActionState } from "react";
import { acceptPortalInvite } from "@/app/actions/portal-auth";
import { Label, Input, RequiredMark } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(acceptPortalInvite.bind(null, token), undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="password">
          Password
          <RequiredMark />
        </Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required autoFocus />
      </div>
      <div>
        <Label htmlFor="confirmPassword">
          Confirm password
          <RequiredMark />
        </Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </div>
      {state?.error && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Setting password…" : "Activate portal access"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword } from "@/app/actions/users";
import { Label, Input, RequiredMark } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(changePassword, undefined);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="currentPassword">
          Current password
          <RequiredMark />
        </Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <Label htmlFor="newPassword">
          New password
          <RequiredMark />
        </Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {state && "error" in state && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">Password updated.</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}

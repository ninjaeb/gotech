"use client";

import { useActionState } from "react";
import { updateMyPhone } from "@/app/actions/users";
import { Label, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { PHONE_FORMAT_HINT } from "@/lib/phone";

export function MyPhoneForm({ currentPhone }: { currentPhone: string | null }) {
  const [state, formAction, pending] = useActionState(updateMyPhone, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="my-phone">Your phone number</Label>
        <Input
          id="my-phone"
          name="phone"
          type="tel"
          defaultValue={currentPhone ?? ""}
          placeholder="+60 12 345 6789"
        />
        <p className="mt-1 text-xs text-slate-400">{PHONE_FORMAT_HINT} Leave blank to opt out.</p>
      </div>

      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      {state && "success" in state && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">Saved.</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

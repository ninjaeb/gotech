"use client";

import { useActionState } from "react";
import { updateReferralSettings } from "@/app/actions/referrals";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { useActionToast } from "@/components/ui/toast";

export function ReferralSettingsForm({ commissionRate, landingUrl }: { commissionRate: number; landingUrl: string }) {
  const [state, formAction, pending] = useActionState(updateReferralSettings, undefined);
  useActionToast(state, "Saved.", { toastErrors: false });

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="commissionRate">Default commission rate (%)</Label>
          <Input
            id="commissionRate"
            name="commissionRate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            required
            defaultValue={commissionRate}
          />
          <p className="mt-1 text-xs text-slate-400">
            Of a referred deal&apos;s value, earned when it&apos;s won. Override per partner from Referrals.
          </p>
        </div>
        <div>
          <Label htmlFor="landingUrl">Landing page</Label>
          <Input id="landingUrl" name="landingUrl" type="url" required defaultValue={landingUrl} />
          <p className="mt-1 text-xs text-slate-400">
            Where a partner&apos;s link sends visitors. Must have the lead-capture widget on it.
          </p>
        </div>
      </div>
      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

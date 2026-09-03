"use client";

import { useActionState } from "react";
import { updateCurrency } from "@/app/actions/settings";
import { CURRENCIES } from "@/lib/currency";
import { Label, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/components/ui/toast";

export function CurrencyForm({ currency }: { currency: string }) {
  const [state, formAction, pending] = useActionState(updateCurrency, undefined);
  useActionToast(state, "Currency saved.", { toastErrors: false });

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="currency">
          Used for every deal value across the CRM (dashboard, pipeline, AI summaries)
        </Label>
        <Select key={currency} id="currency" name="currency" defaultValue={currency}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
            </option>
          ))}
        </Select>
      </div>
      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

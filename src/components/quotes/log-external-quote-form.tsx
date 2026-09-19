"use client";

import { useActionState } from "react";
import type { QuoteFormState } from "@/app/actions/quotes";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export function LogExternalQuoteForm({
  action,
  currency,
}: {
  action: (prevState: QuoteFormState, formData: FormData) => Promise<QuoteFormState>;
  currency: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="ext-title">Title</Label>
        <Input id="ext-title" name="title" placeholder="e.g. Website redesign — Phase 1" required />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ext-reference">Quote number / reference</Label>
          <Input id="ext-reference" name="reference" placeholder="Whatever the original document is numbered" required />
          <p className="mt-1 text-xs text-slate-400">Stored as EXT-&lt;this&gt;, so it never collides with a CRM-issued quote number.</p>
        </div>
        <div>
          <Label htmlFor="ext-total">Amount ({currency})</Label>
          <Input id="ext-total" name="total" inputMode="decimal" placeholder="0.00" required />
        </div>
      </div>
      <div>
        <Label htmlFor="ext-issued-at">Date issued</Label>
        <Input id="ext-issued-at" name="issuedAt" type="date" defaultValue={todayInput()} />
      </div>
      <div>
        <Label htmlFor="ext-description">What was quoted (optional)</Label>
        <Textarea id="ext-description" name="description" rows={2} placeholder="A one-line description for this deal's record" />
      </div>
      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Logging…" : "Log quote"}
        </Button>
      </div>
    </form>
  );
}

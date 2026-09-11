"use client";

import { useActionState } from "react";
import { CalendarClock } from "lucide-react";
import { extendQuoteValidity } from "@/app/actions/quotes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useActionToast } from "@/components/ui/toast";

export function ExtendValidityForm({ quoteId, validUntil }: { quoteId: string; validUntil: string }) {
  const [state, formAction, pending] = useActionState(extendQuoteValidity.bind(null, quoteId), undefined);
  useActionToast(state, "Validity updated.", { toastErrors: false });

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex gap-2">
        <Input name="validUntil" type="date" defaultValue={validUntil} required aria-label="Valid until" className="flex-1" />
        <Button type="submit" variant="secondary" disabled={pending}>
          <CalendarClock className="h-4 w-4" />
          {pending ? "Saving…" : "Extend"}
        </Button>
      </div>
      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { markInvoicePaid } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { useActionToast } from "@/components/ui/toast";

// Staff confirming payment arrived — this app has no payment gateway, so
// "paid" is always a manual record (a bank transfer reference, a receipt
// number, or nothing at all).
export function MarkInvoicePaidForm({ invoiceId }: { invoiceId: string }) {
  const [state, formAction, pending] = useActionState(markInvoicePaid.bind(null, invoiceId), undefined);
  useActionToast(state, "Invoice marked paid.", { toastErrors: false });

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="payment-reference">Reference (optional)</Label>
        <Input id="payment-reference" name="reference" placeholder="Bank transfer ref., receipt no.…" />
      </div>
      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      <Button type="submit" variant="secondary" size="sm" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Mark as paid"}
      </Button>
    </form>
  );
}

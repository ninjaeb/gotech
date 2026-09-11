"use client";

import { useActionState } from "react";
import { Ban } from "lucide-react";
import { voidInvoice } from "@/app/actions/invoices";
import { Input } from "@/components/ui/field";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { useActionToast } from "@/components/ui/toast";

// Voiding keeps the number on record (the client may hold the document) but
// closes it out: the public link shows it as void and it can no longer be
// marked paid.
export function VoidInvoiceForm({ invoiceId }: { invoiceId: string }) {
  const [state, formAction, pending] = useActionState(voidInvoice.bind(null, invoiceId), undefined);
  useActionToast(state, "Invoice voided.", { toastErrors: false });

  return (
    <form action={formAction} className="space-y-2">
      <Input name="reason" placeholder="Reason (optional, shown in history)" aria-label="Void reason" />
      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      <ConfirmSubmitButton
        confirmMessage="Void this invoice? The client will no longer be able to pay it."
        variant="secondary"
        disabled={pending}
        className="w-full"
      >
        <Ban className="h-4 w-4" />
        {pending ? "Voiding…" : "Void invoice"}
      </ConfirmSubmitButton>
    </form>
  );
}

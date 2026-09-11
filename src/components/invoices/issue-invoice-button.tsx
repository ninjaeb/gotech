"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import type { InvoiceActionState } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/components/ui/toast";

// "Issue" allocates the number and freezes the document — a confirm, since
// there's no way back to draft afterwards (only void + a fresh invoice).
export function IssueInvoiceButton({ action }: { action: (prevState: InvoiceActionState, formData: FormData) => Promise<InvoiceActionState> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  useActionToast(state, "Invoice issued.");

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!confirm("Issue this invoice? It gets its number now and can't be edited afterwards — only voided.")) event.preventDefault();
      }}
    >
      <Button type="submit" disabled={pending}>
        <Send className="h-4 w-4" />
        {pending ? "Issuing…" : "Issue"}
      </Button>
    </form>
  );
}

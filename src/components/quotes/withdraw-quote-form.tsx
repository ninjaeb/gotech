"use client";

import { useActionState } from "react";
import { Ban } from "lucide-react";
import { withdrawQuote } from "@/app/actions/quotes";
import { Input } from "@/components/ui/field";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { useActionToast } from "@/components/ui/toast";

// Withdrawing keeps the number on record (the client may hold the document)
// but closes it: the public link shows it as withdrawn and it can no longer
// be accepted.
export function WithdrawQuoteForm({ quoteId }: { quoteId: string }) {
  const [state, formAction, pending] = useActionState(withdrawQuote.bind(null, quoteId), undefined);
  useActionToast(state, "Quote withdrawn.", { toastErrors: false });

  return (
    <form action={formAction} className="space-y-2">
      <Input name="reason" placeholder="Reason (optional, shown in history)" aria-label="Withdrawal reason" />
      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      <ConfirmSubmitButton
        confirmMessage="Withdraw this quote? The client will no longer be able to accept it."
        variant="secondary"
        disabled={pending}
        className="w-full"
      >
        <Ban className="h-4 w-4" />
        {pending ? "Withdrawing…" : "Withdraw quote"}
      </ConfirmSubmitButton>
    </form>
  );
}

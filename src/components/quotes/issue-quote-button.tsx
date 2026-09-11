"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import type { QuoteActionState } from "@/app/actions/quotes";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/components/ui/toast";

// "Issue" allocates the number and freezes the document — a confirm, since
// there's no way back to draft afterwards (only a revision).
export function IssueQuoteButton({ action }: { action: (prevState: QuoteActionState, formData: FormData) => Promise<QuoteActionState> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  useActionToast(state, "Quote issued.");

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!confirm("Issue this quote? It gets its number now and can't be edited afterwards — only revised.")) event.preventDefault();
      }}
    >
      <Button type="submit" disabled={pending}>
        <Send className="h-4 w-4" />
        {pending ? "Issuing…" : "Issue"}
      </Button>
    </form>
  );
}

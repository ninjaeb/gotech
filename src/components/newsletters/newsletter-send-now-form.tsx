"use client";

import { useActionState } from "react";
import { sendNewsletterNow } from "@/app/actions/newsletters";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";

export function NewsletterSendNowForm({ newsletterId, subject }: { newsletterId: string; subject: string }) {
  const [state, formAction, pending] = useActionState(sendNewsletterNow.bind(null, newsletterId), undefined);

  return (
    <form action={formAction}>
      <ConfirmSubmitButton
        variant="primary"
        disabled={pending}
        confirmMessage={`Send "${subject}" right now? This can't be undone.`}
      >
        {pending ? "Sending…" : "Send now"}
      </ConfirmSubmitButton>
      {state?.error && <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
    </form>
  );
}

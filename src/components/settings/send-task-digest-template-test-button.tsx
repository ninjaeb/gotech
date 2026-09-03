"use client";

import { useActionState } from "react";
import { sendTaskDigestTemplateTest } from "@/app/actions/settings";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { useActionToast } from "@/components/ui/toast";

export function SendTaskDigestTemplateTestButton() {
  const [state, formAction, pending] = useActionState(sendTaskDigestTemplateTest, undefined);
  useActionToast(state, "Sent — check your WhatsApp.", { toastErrors: false });

  return (
    <form action={formAction} className="space-y-2">
      <ConfirmSubmitButton
        confirmMessage="Send a test daily task digest (with placeholder counts) to your own number right now?"
        variant="secondary"
      >
        {pending ? "Sending…" : "Send test"}
      </ConfirmSubmitButton>

      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
    </form>
  );
}

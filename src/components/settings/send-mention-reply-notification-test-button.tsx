"use client";

import { useActionState } from "react";
import { sendMentionReplyNotificationTest } from "@/app/actions/whatsapp-account";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";

export function SendMentionReplyNotificationTestButton() {
  const [state, formAction, pending] = useActionState(sendMentionReplyNotificationTest, undefined);

  return (
    <form action={formAction} className="space-y-2">
      <ConfirmSubmitButton
        confirmMessage="Send a test mention-reply WhatsApp notification to your own number right now?"
        variant="secondary"
      >
        {pending ? "Sending…" : "Send test"}
      </ConfirmSubmitButton>

      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      {state && "success" in state && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">Sent — check your WhatsApp.</p>
      )}
    </form>
  );
}

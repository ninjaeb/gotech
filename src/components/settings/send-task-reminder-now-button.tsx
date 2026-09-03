"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendTaskRemindersNow } from "@/app/actions/settings";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { useToast } from "@/components/ui/toast";

export function SendTaskReminderNowButton() {
  const [state, formAction, pending] = useActionState(sendTaskRemindersNow, undefined);
  const toast = useToast();
  const seenRef = useRef(state);

  // Bespoke multi-recipient result — not the app's usual {error}|{success}
  // shape — so this gets its own toast summary instead of useActionToast.
  useEffect(() => {
    if (state === seenRef.current) return;
    seenRef.current = state;
    if (!state) return;
    if (!state.ok) {
      toast.error(state.message ?? "Failed to send reminders.");
    } else if (state.sent.length === 0 && state.skipped.length === 0 && state.failed.length === 0) {
      toast.success("No one has a phone number set.");
    } else if (state.failed.length > 0) {
      toast.error(`Sent to ${state.sent.length}, ${state.failed.length} failed — see details below.`);
    } else {
      toast.success(`Sent to ${state.sent.length} ${state.sent.length === 1 ? "person" : "people"}.`);
    }
  }, [state, toast]);

  return (
    <form action={formAction} className="space-y-2">
      <ConfirmSubmitButton
        confirmMessage="Send the WhatsApp task reminder right now, to everyone with a phone number set — ignoring the configured hour and each person's usual once-a-day limit?"
        variant="secondary"
      >
        {pending ? "Sending…" : "Send now"}
      </ConfirmSubmitButton>

      {state && !state.ok && <p className="text-sm text-rose-600 dark:text-rose-400">{state.message}</p>}

      {state && state.ok && (
        <div className="space-y-1 text-sm">
          {state.sent.length === 0 && state.skipped.length === 0 && state.failed.length === 0 && (
            <p className="text-slate-500 dark:text-slate-400">No one has a phone number set.</p>
          )}
          {state.sent.map(({ name, overdueCount, dueTodayCount }) => (
            <p key={name} className="text-emerald-700 dark:text-emerald-400">
              {name}: sent — {overdueCount} overdue, {dueTodayCount} due today.
            </p>
          ))}
          {state.skipped.map(({ name, reason }) => (
            <p key={name} className="text-slate-500 dark:text-slate-400">
              {name}: skipped ({reason}).
            </p>
          ))}
          {state.failed.map(({ name, error }) => (
            <p key={name} className="text-rose-600 dark:text-rose-400">
              {name}: failed — {error}
            </p>
          ))}
        </div>
      )}
    </form>
  );
}

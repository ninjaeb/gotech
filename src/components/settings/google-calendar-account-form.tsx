"use client";

import { useActionState } from "react";
import { disconnectGoogleCalendar } from "@/app/actions/google-calendar";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { useActionToast } from "@/components/ui/toast";

type ConnectedAccount = { email: string; lastSyncError: string | null };

export function GoogleCalendarAccountForm({ account }: { account: ConnectedAccount | null }) {
  const [state, formAction, pending] = useActionState(disconnectGoogleCalendar, undefined);
  useActionToast(state, "Google Calendar disconnected.", { toastErrors: false });

  if (account) {
    return (
      <div className="space-y-3">
        <div className="rounded-md bg-slate-50 px-3 py-2.5 text-sm dark:bg-neutral-900">
          <p className="font-medium text-slate-800 dark:text-slate-200">{account.email}</p>
          {account.lastSyncError ? (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">Last sync error: {account.lastSyncError}</p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Tasks assigned to you with a due date sync here automatically.
            </p>
          )}
        </div>
        <form action={formAction}>
          <ConfirmSubmitButton
            confirmMessage="Disconnect Google Calendar? Sync will stop until you reconnect."
            variant="secondary"
            size="sm"
            disabled={pending}
          >
            Disconnect
          </ConfirmSubmitButton>
        </form>
      </div>
    );
  }

  return (
    <form method="post" action="/api/auth/google-calendar">
      <button type="submit" className={buttonClasses("secondary", "sm")}>
        Connect Google Calendar
      </button>
    </form>
  );
}

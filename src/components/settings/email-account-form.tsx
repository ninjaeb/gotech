"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { connectEmailAccount, disconnectEmailAccount, syncEmailAccountNow } from "@/app/actions/email-account";
import { FieldGroup, Input } from "@/components/ui/field";
import { Button, buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type ConnectedAccount = {
  email: string;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
};

export function EmailAccountForm({ account }: { account: ConnectedAccount | null }) {
  const [state, formAction, pending] = useActionState(connectEmailAccount, undefined);

  if (account) {
    return (
      <div className="space-y-3">
        <div className="rounded-md bg-slate-50 px-3 py-2.5 text-sm dark:bg-neutral-900">
          <p className="font-medium text-slate-800 dark:text-slate-200">{account.email}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {account.lastSyncedAt ? `Last synced ${formatDateTime(account.lastSyncedAt)}` : "Not synced yet"}
          </p>
          {account.lastSyncError && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">Last sync error: {account.lastSyncError}</p>
          )}
        </div>
        <div className="flex gap-2">
          <form action={syncEmailAccountNow}>
            <button type="submit" className={cn(buttonClasses("secondary", "sm"))}>
              <RefreshCw className="h-3.5 w-3.5" />
              Sync now
            </button>
          </form>
          <form action={disconnectEmailAccount}>
            <ConfirmSubmitButton
              confirmMessage="Disconnect this mailbox? Sync will stop until you reconnect."
              variant="secondary"
              size="sm"
            >
              Disconnect
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Works with any IMAP/SMTP mailbox. Gmail needs an{" "}
        <a
          href="https://myaccount.google.com/apppasswords"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:underline"
        >
          App Password
        </a>{" "}
        (not your regular password) — Microsoft 365 and most other providers require the same for
        IMAP/SMTP access.
      </p>

      <FieldGroup label="Your email address" htmlFor="email" required>
        <Input id="email" name="email" type="email" required placeholder="you@gotech.com" />
      </FieldGroup>
      <FieldGroup label="Username (usually the same as your email)" htmlFor="username" required>
        <Input id="username" name="username" required placeholder="you@gotech.com" />
      </FieldGroup>
      <FieldGroup label="Password / App Password" htmlFor="password" required>
        <Input id="password" name="password" type="password" required />
      </FieldGroup>

      <div className="grid gap-3 sm:grid-cols-3">
        <FieldGroup label="IMAP host" htmlFor="imapHost" required className="sm:col-span-2">
          <Input id="imapHost" name="imapHost" required placeholder="imap.gmail.com" />
        </FieldGroup>
        <FieldGroup label="Port" htmlFor="imapPort" required>
          <Input id="imapPort" name="imapPort" type="number" required defaultValue={993} />
        </FieldGroup>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          name="imapSecure"
          defaultChecked
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-neutral-700"
        />
        IMAP uses SSL/TLS
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <FieldGroup label="SMTP host" htmlFor="smtpHost" required className="sm:col-span-2">
          <Input id="smtpHost" name="smtpHost" required placeholder="smtp.gmail.com" />
        </FieldGroup>
        <FieldGroup label="Port" htmlFor="smtpPort" required>
          <Input id="smtpPort" name="smtpPort" type="number" required defaultValue={465} />
        </FieldGroup>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          name="smtpSecure"
          defaultChecked
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-neutral-700"
        />
        SMTP uses SSL/TLS (uncheck for STARTTLS on port 587)
      </label>

      {state?.error && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Testing connection…" : "Connect"}
      </Button>
    </form>
  );
}

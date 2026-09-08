"use client";

import { useActionState } from "react";
import { deleteNewsletterSender, saveNewsletterSender } from "@/app/actions/newsletter-sender";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input } from "@/components/ui/field";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { useActionToast } from "@/components/ui/toast";

type Sender = {
  fromName: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  username: string;
};

export function NewsletterSenderForm({ sender }: { sender: Sender | null }) {
  const [state, formAction, pending] = useActionState(saveNewsletterSender, undefined);
  useActionToast(state, "Sender saved.", { toastErrors: false });
  const [deleteState, deleteAction, deletePending] = useActionState(deleteNewsletterSender, undefined);
  useActionToast(deleteState, "Sender removed.", { toastErrors: false });

  return (
    <div className="space-y-4">
      {sender && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2.5 text-sm dark:bg-neutral-900">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {sender.fromName} &lt;{sender.fromEmail}&gt;
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {sender.smtpHost}:{sender.smtpPort}
            </p>
          </div>
          <form action={deleteAction}>
            <ConfirmSubmitButton
              confirmMessage="Remove the newsletter sender? Scheduled sends will pause until you reconnect one."
              variant="secondary"
              size="sm"
              disabled={deletePending}
            >
              {deletePending ? "Removing…" : "Remove"}
            </ConfirmSubmitButton>
          </form>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          A dedicated mailbox for bulk sends — not a personal inbox. Mixing newsletter volume onto someone&apos;s own
          connected mailbox (Settings → Integrations) risks that mailbox&apos;s deliverability.
          {sender && " Saving below replaces the current sender — you'll need to re-enter all fields, including the password."}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <FieldGroup label="From name" htmlFor="fromName" required>
            <Input id="fromName" name="fromName" required defaultValue={sender?.fromName} placeholder="Gotka" />
          </FieldGroup>
          <FieldGroup label="From email" htmlFor="fromEmail" required>
            <Input
              id="fromEmail"
              name="fromEmail"
              type="email"
              required
              defaultValue={sender?.fromEmail}
              placeholder="newsletter@gotka.com"
            />
          </FieldGroup>
        </div>

        <FieldGroup label="Username (usually the same as the from email)" htmlFor="username" required>
          <Input id="username" name="username" required defaultValue={sender?.username} placeholder="newsletter@gotka.com" />
        </FieldGroup>
        <FieldGroup label="Password" htmlFor="password" required>
          <Input id="password" name="password" type="password" required placeholder={sender ? "••••••••" : undefined} />
        </FieldGroup>

        <div className="grid gap-3 sm:grid-cols-3">
          <FieldGroup label="SMTP host" htmlFor="smtpHost" required className="sm:col-span-2">
            <Input id="smtpHost" name="smtpHost" required defaultValue={sender?.smtpHost} placeholder="smtp.gmail.com" />
          </FieldGroup>
          <FieldGroup label="Port" htmlFor="smtpPort" required>
            <Input id="smtpPort" name="smtpPort" type="number" required defaultValue={sender?.smtpPort ?? 465} />
          </FieldGroup>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            name="smtpSecure"
            defaultChecked={sender?.smtpSecure ?? true}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-neutral-700"
          />
          SMTP uses SSL/TLS (uncheck for STARTTLS on port 587)
        </label>

        {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}

        <Button type="submit" disabled={pending}>
          {pending ? "Testing connection…" : sender ? "Save & test connection" : "Connect"}
        </Button>
      </form>
    </div>
  );
}

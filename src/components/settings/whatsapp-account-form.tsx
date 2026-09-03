"use client";

import { useActionState } from "react";
import { connectWhatsAppAccount, disconnectWhatsAppAccount } from "@/app/actions/whatsapp-account";
import { FieldGroup, Input, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { useActionToast } from "@/components/ui/toast";

type ConnectedWhatsAppAccount = {
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  webhookVerifyToken: string;
  lastSyncError: string | null;
};

export function WhatsAppAccountForm({
  account,
  webhookUrl,
}: {
  account: ConnectedWhatsAppAccount | null;
  webhookUrl: string;
}) {
  const [state, formAction, pending] = useActionState(connectWhatsAppAccount, undefined);
  useActionToast(state, "WhatsApp account connected.", { toastErrors: false });
  const [disconnectState, disconnectAction, disconnectPending] = useActionState(disconnectWhatsAppAccount, undefined);
  useActionToast(disconnectState, "WhatsApp account disconnected.", { toastErrors: false });

  if (account) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-slate-50 px-3 py-2.5 text-sm dark:bg-neutral-900">
          <p className="font-medium text-slate-800 dark:text-slate-200">
            {account.displayPhoneNumber ?? "Connected"}
          </p>
          {/* Shown even though displayPhoneNumber already renders above — this is the
              raw ID Meta's API is called with, so it's what to diff against the
              "Phone number ID" field on Meta's WhatsApp → API Setup page when sends
              fail with a "wrong object type" style error (e.g. GraphMethodException). */}
          <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
            Phone number ID: {account.phoneNumberId}
          </p>
          {account.lastSyncError && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">Last error: {account.lastSyncError}</p>
          )}
        </div>

        <div>
          <Label htmlFor="whatsapp-webhook-url">Webhook URL</Label>
          <p className="mb-1.5 text-xs text-slate-500 dark:text-slate-400">
            Paste this and the verify token below into your Meta App Dashboard, under WhatsApp → Configuration →
            Webhook.
          </p>
          <div className="flex items-center gap-2">
            <Input id="whatsapp-webhook-url" readOnly value={webhookUrl} className="font-mono text-xs" />
            <CopyLinkButton text={webhookUrl} />
          </div>
        </div>
        <div>
          <Label htmlFor="whatsapp-verify-token">Verify token</Label>
          <div className="flex items-center gap-2">
            <Input id="whatsapp-verify-token" readOnly value={account.webhookVerifyToken} className="font-mono text-xs" />
            <CopyLinkButton text={account.webhookVerifyToken} />
          </div>
        </div>

        <form action={disconnectAction}>
          <ConfirmSubmitButton
            confirmMessage="Disconnect WhatsApp Business? Sending and receiving will stop until you reconnect."
            variant="secondary"
            size="sm"
            disabled={disconnectPending}
          >
            {disconnectPending ? "Disconnecting…" : "Disconnect"}
          </ConfirmSubmitButton>
        </form>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Needs a Meta WhatsApp Business Platform (Cloud API) app — see the README&apos;s WhatsApp Business setup
        section for how to create one and find these values. The webhook URL to register in Meta&apos;s dashboard
        appears here once connected.
      </p>

      <FieldGroup label="Phone number ID" htmlFor="phoneNumberId" required>
        <Input id="phoneNumberId" name="phoneNumberId" required />
      </FieldGroup>
      <FieldGroup label="WhatsApp Business Account ID" htmlFor="businessAccountId" required>
        <Input id="businessAccountId" name="businessAccountId" required />
      </FieldGroup>
      <FieldGroup label="Permanent access token" htmlFor="accessToken" required>
        <Input id="accessToken" name="accessToken" type="password" required />
      </FieldGroup>
      <FieldGroup label="App secret" htmlFor="appSecret" required>
        <Input id="appSecret" name="appSecret" type="password" required />
      </FieldGroup>

      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Testing connection…" : "Connect"}
      </Button>
    </form>
  );
}

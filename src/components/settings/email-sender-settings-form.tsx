"use client";

import { useActionState, useState } from "react";
import { updateEmailSenderSettings } from "@/app/actions/email-account";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/components/ui/toast";

export function EmailSenderSettingsForm({
  defaultFromName,
  defaultSignature,
  currentUserName,
}: {
  defaultFromName: string;
  defaultSignature: string;
  currentUserName: string;
}) {
  const [state, formAction, pending] = useActionState(updateEmailSenderSettings, undefined);
  const [signature, setSignature] = useState(defaultSignature);
  useActionToast(state, "Sender settings saved.", { toastErrors: false });

  return (
    <form action={formAction} className="space-y-4 border-t border-slate-100 pt-4 dark:border-neutral-800">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Sender name &amp; signature</h3>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Applies to every email this mailbox sends — Contact/Task send dialogs, sequence steps, and the daily
          task digest.
        </p>
      </div>

      <div>
        <FieldGroup label="Display name" htmlFor="fromName">
          <Input id="fromName" name="fromName" defaultValue={defaultFromName} placeholder={currentUserName} />
        </FieldGroup>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Shown to recipients instead of your bare address, e.g. &quot;{currentUserName} &lt;you@gotech.com&gt;&quot;.
          Leave blank to send as just the address.
        </p>
      </div>

      <div>
        <FieldGroup label="HTML signature" htmlFor="htmlSignature">
          <Textarea
            id="htmlSignature"
            name="htmlSignature"
            rows={6}
            value={signature}
            onChange={(event) => setSignature(event.target.value)}
            placeholder={"<p>Jane Doe<br>Sales, GoTech</p>"}
            className="font-mono text-xs"
          />
        </FieldGroup>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Raw HTML, appended below the message on every email you send. Leave blank to send plain text with no
          signature — recipients&apos; own mail apps still get a plain-text copy either way.
        </p>
      </div>

      {signature.trim() && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">Preview</p>
          {/* This admin's own authored HTML, previewed only in their own
              browser and RBAC-gated page — the same trust boundary as the
              text they're about to email out with it, so no sanitization
              is applied here (and none would be meaningful: every mail
              client already strips active content from HTML email on
              receipt regardless of what this app does). */}
          <div
            className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-slate-200"
            dangerouslySetInnerHTML={{ __html: signature }}
          />
        </div>
      )}

      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

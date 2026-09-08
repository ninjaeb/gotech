"use client";

import { useActionState } from "react";
import { sendWhatsAppBroadcast } from "@/app/actions/whatsapp-broadcast";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select } from "@/components/ui/field";

export function WhatsAppBroadcastForm({ lists }: { lists: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(sendWhatsAppBroadcast, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <FieldGroup label="Headline" htmlFor="headline" required>
        <Input id="headline" name="headline" required placeholder="5 tips to close deals faster" />
      </FieldGroup>

      <FieldGroup label="Link" htmlFor="link" required>
        <Input
          id="link"
          name="link"
          type="url"
          required
          placeholder="https://gotka.com/blog/close-deals-faster"
        />
      </FieldGroup>

      <FieldGroup label="Audience" htmlFor="listId" required>
        {lists.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No lists yet — create one under Lists first.
          </p>
        ) : (
          <Select id="listId" name="listId" required defaultValue="">
            <option value="" disabled>
              Choose a list…
            </option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </Select>
        )}
      </FieldGroup>

      <p className="text-xs text-slate-400">
        Only contacts in this list who opted into WhatsApp updates and have a phone on file will actually
        receive it. Sends immediately via the approved <code>gotech_new_update</code> template — there&apos;s
        no draft or schedule step.
      </p>

      {state?.error && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send broadcast"}
        </Button>
      </div>
    </form>
  );
}

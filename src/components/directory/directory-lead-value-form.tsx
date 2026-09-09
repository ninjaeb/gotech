"use client";

import { useActionState } from "react";
import { updateDirectoryLeadDetails } from "@/app/actions/directory";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";
import { useActionToast } from "@/components/ui/toast";

export function DirectoryLeadValueForm({
  leadId,
  value,
  notes,
  currency,
}: {
  leadId: string;
  value: number | null;
  notes: string | null;
  currency: string;
}) {
  const [state, formAction, pending] = useActionState(updateDirectoryLeadDetails.bind(null, leadId), undefined);
  useActionToast(state, "Saved.");

  return (
    <form action={formAction} className="space-y-3">
      <FieldGroup label={`Value (${currency})`} htmlFor="value">
        <Input id="value" name="value" type="number" min="0" step="0.01" defaultValue={value ?? ""} placeholder="0.00" />
      </FieldGroup>
      <FieldGroup label="Notes" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={3} defaultValue={notes ?? ""} placeholder="Private notes about this lead — only you see these." />
      </FieldGroup>
      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

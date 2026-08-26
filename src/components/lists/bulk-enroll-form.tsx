"use client";

import { useActionState } from "react";
import { bulkEnrollListInSequence, type BulkEnrollState } from "@/app/actions/sequence-enrollments";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

export function BulkEnrollForm({
  listId,
  sequences,
}: {
  listId: string;
  sequences: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<BulkEnrollState, FormData>(
    bulkEnrollListInSequence.bind(null, listId),
    undefined,
  );

  if (sequences.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No active sequences yet — create one in Settings to enroll this list&apos;s contacts.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex items-end gap-2">
        <Select name="sequenceId" required defaultValue="" className="flex-1">
          <option value="" disabled>
            Enroll every contact in…
          </option>
          {sequences.map((sequence) => (
            <option key={sequence.id} value={sequence.id}>
              {sequence.name}
            </option>
          ))}
        </Select>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Enrolling…" : "Enroll list"}
        </Button>
      </div>
      {state?.status === "error" && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{state.message}</p>
      )}
      {state?.status === "done" && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enrolled {state.enrolled}
          {state.skipped > 0 && `, skipped ${state.skipped} (no email or already enrolled)`}.
        </p>
      )}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { updateTaskAssignmentNotificationDelay } from "@/app/actions/settings";
import { TASK_ASSIGNMENT_DELAY_OPTIONS_MINUTES, formatDelayLabel } from "@/lib/task-notification-delay";
import { Label, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/components/ui/toast";

export function TaskAssignmentDelayForm({ delayMinutes }: { delayMinutes: number }) {
  const [state, formAction, pending] = useActionState(updateTaskAssignmentNotificationDelay, undefined);
  useActionToast(state, "Delay saved.", { toastErrors: false });

  return (
    <form action={formAction} className="mb-4 flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor="delayMinutes">Send after</Label>
        <Select
          key={delayMinutes}
          id="delayMinutes"
          name="delayMinutes"
          defaultValue={delayMinutes}
          className="w-40"
        >
          {TASK_ASSIGNMENT_DELAY_OPTIONS_MINUTES.map((minutes) => (
            <option key={minutes} value={minutes}>
              {formatDelayLabel(minutes)}
            </option>
          ))}
        </Select>
      </div>
      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

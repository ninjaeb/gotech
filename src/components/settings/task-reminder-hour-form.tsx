"use client";

import { useActionState } from "react";
import { updateTaskReminderHour } from "@/app/actions/settings";
import { Label, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/components/ui/toast";

// e.g. 0 -> "12:00 AM", 13 -> "1:00 PM" — a stable, locale-independent label
// for the hour <select>, same reasoning as booking.ts's formatSlotLabel.
function formatHourLabel(hour: number) {
  const period = hour < 12 ? "AM" : "PM";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour}:00 ${period}`;
}

export function TaskReminderHourForm({ taskReminderHour }: { taskReminderHour: number }) {
  const [state, formAction, pending] = useActionState(updateTaskReminderHour, undefined);
  useActionToast(state, "Reminder time saved.", { toastErrors: false });

  return (
    <form action={formAction} className="mb-4 flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor="taskReminderHour">Send at</Label>
        <Select
          key={taskReminderHour}
          id="taskReminderHour"
          name="taskReminderHour"
          defaultValue={taskReminderHour}
          className="w-40"
        >
          {Array.from({ length: 24 }, (_, hour) => (
            <option key={hour} value={hour}>
              {formatHourLabel(hour)}
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

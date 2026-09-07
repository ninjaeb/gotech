"use client";

import { useActionState } from "react";
import { scheduleNewsletter } from "@/app/actions/newsletters";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { controlHeight, fieldClasses } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function NewsletterScheduleForm({ newsletterId }: { newsletterId: string }) {
  const [state, formAction, pending] = useActionState(scheduleNewsletter.bind(null, newsletterId), undefined);

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
          <DatePicker name="scheduledDate" placeholder="Send date" />
        </div>
        <div>
          <label
            htmlFor="scheduledTime"
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Time
          </label>
          <input
            id="scheduledTime"
            name="scheduledTime"
            type="time"
            required
            defaultValue="09:00"
            className={cn(fieldClasses, controlHeight, "w-32")}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Scheduling…" : "Schedule"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
    </form>
  );
}

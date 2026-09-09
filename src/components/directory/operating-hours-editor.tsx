"use client";

import { useState } from "react";
import { DAYS_OF_WEEK, type DayOfWeek, type OperatingHours } from "@/lib/operating-hours";
import { Select, fieldClasses, controlHeight } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

// Sensible starting point when a partner switches a day to Open for the
// first time — not a claim about their actual hours, just something
// reasonable to adjust rather than two blank time fields.
const DEFAULT_OPEN = "09:00";
const DEFAULT_CLOSE = "18:00";

const timeInputClasses = cn(fieldClasses, controlHeight, "w-auto");

// Google-My-Business-style picker: a Closed/Open dropdown per day, with
// two time fields that appear only once a day is set to Open. Only the
// per-day status needs to be React state (it decides whether the time
// fields render at all) — the time inputs themselves stay native/
// uncontrolled, read via FormData at submit time like the rest of this
// form's fields.
export function OperatingHoursEditor({ initialHours }: { initialHours: OperatingHours | null }) {
  const [statuses, setStatuses] = useState<Record<DayOfWeek, "open" | "closed">>(() => {
    const result = {} as Record<DayOfWeek, "open" | "closed">;
    for (const day of DAYS_OF_WEEK) {
      result[day] = initialHours?.[day] ? "open" : "closed";
    }
    return result;
  });

  return (
    <div className="space-y-2">
      {DAYS_OF_WEEK.map((day) => {
        const dayHours = initialHours?.[day] ?? null;
        const isOpen = statuses[day] === "open";
        return (
          <div key={day} className="flex flex-wrap items-center gap-2">
            <span className="w-24 shrink-0 text-sm text-slate-700 dark:text-slate-300">{DAY_LABELS[day]}</span>
            <Select
              name={`hours-${day}-status`}
              value={statuses[day]}
              onChange={(event) =>
                setStatuses((prev) => ({ ...prev, [day]: event.target.value as "open" | "closed" }))
              }
              className="!h-9 w-28 shrink-0"
            >
              <option value="closed">Closed</option>
              <option value="open">Open</option>
            </Select>
            {isOpen && (
              <>
                <input
                  type="time"
                  name={`hours-${day}-open`}
                  defaultValue={dayHours?.open ?? DEFAULT_OPEN}
                  className={timeInputClasses}
                />
                <span className="text-sm text-slate-400">to</span>
                <input
                  type="time"
                  name={`hours-${day}-close`}
                  defaultValue={dayHours?.close ?? DEFAULT_CLOSE}
                  className={timeInputClasses}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

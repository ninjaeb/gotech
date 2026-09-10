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

// What "24 Hours" actually stores — the same all-day range a Google Maps
// import already produces for a place Google reports as always open (see
// operatingHoursFromGooglePeriods in src/lib/google-places.ts), so nothing
// downstream (detail-page display, schema.org openingHours) needs to learn
// a new shape for it.
const ALL_DAY_OPEN = "00:00";
const ALL_DAY_CLOSE = "23:59";

// "Copy to weekday" (on Monday's own row) fans its status and time out to
// these four days only — Saturday and Sunday are deliberately not
// "weekday".
const OTHER_WEEKDAYS: DayOfWeek[] = ["tuesday", "wednesday", "thursday", "friday"];

type DayStatus = "closed" | "open" | "24h";
type DayTime = { open: string; close: string };

const timeInputClasses = cn(fieldClasses, controlHeight, "w-auto text-base");

function statusFor(hours: DayTime | null): DayStatus {
  if (!hours) return "closed";
  return hours.open === ALL_DAY_OPEN && hours.close === ALL_DAY_CLOSE ? "24h" : "open";
}

// Google-My-Business-style picker: a Closed/Open/24 Hours dropdown per day,
// with two time fields that appear only for Open (24 Hours needs none — it
// submits the fixed all-day range as hidden inputs instead, so the server's
// own parsing only ever needs to read hours-<day>-open/-close for any
// non-closed status, no separate code path per status). Status AND each
// day's own time are both React state — status decides which controls
// render, and the times need to be controlled (not just defaultValue) for
// "Copy to weekday" to be able to write into them programmatically.
export function OperatingHoursEditor({ initialHours }: { initialHours: OperatingHours | null }) {
  const [statuses, setStatuses] = useState<Record<DayOfWeek, DayStatus>>(() => {
    const result = {} as Record<DayOfWeek, DayStatus>;
    for (const day of DAYS_OF_WEEK) result[day] = statusFor(initialHours?.[day] ?? null);
    return result;
  });
  const [times, setTimes] = useState<Record<DayOfWeek, DayTime>>(() => {
    const result = {} as Record<DayOfWeek, DayTime>;
    for (const day of DAYS_OF_WEEK) {
      const hours = initialHours?.[day];
      result[day] = { open: hours?.open ?? DEFAULT_OPEN, close: hours?.close ?? DEFAULT_CLOSE };
    }
    return result;
  });

  function setDayTime(day: DayOfWeek, field: "open" | "close", value: string) {
    setTimes((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  }

  // Copies Monday's own status and time onto Tuesday through Friday in one
  // click — a typical Mon-Fri schedule shouldn't need the same two times
  // (or "24 Hours") set five separate times. Weekends are left alone.
  function copyMondayToWeekday() {
    const mondayStatus = statuses.monday;
    const mondayTime = times.monday;
    setStatuses((prev) => {
      const next = { ...prev };
      for (const day of OTHER_WEEKDAYS) next[day] = mondayStatus;
      return next;
    });
    setTimes((prev) => {
      const next = { ...prev };
      for (const day of OTHER_WEEKDAYS) next[day] = mondayTime;
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {DAYS_OF_WEEK.map((day) => {
        const status = statuses[day];
        return (
          <div key={day} className="flex flex-wrap items-center gap-2">
            <span className="w-24 shrink-0 text-base text-slate-700 dark:text-slate-300">{DAY_LABELS[day]}</span>
            <Select
              name={`hours-${day}-status`}
              value={status}
              onChange={(event) => setStatuses((prev) => ({ ...prev, [day]: event.target.value as DayStatus }))}
              className="!h-9 w-32 shrink-0 text-base"
            >
              <option value="closed">Closed</option>
              <option value="open">Open</option>
              <option value="24h">24 Hours</option>
            </Select>
            {status === "open" && (
              // Grouped in their own flex container so flex-wrap on the row
              // above moves the whole "09:00 to 18:00" block down together
              // on a narrow screen, instead of splitting mid-range — the
              // open time staying on one line while "to" and the close time
              // land alone on the next, with no indent to explain why.
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  name={`hours-${day}-open`}
                  value={times[day].open}
                  onChange={(event) => setDayTime(day, "open", event.target.value)}
                  className={timeInputClasses}
                />
                <span className="text-base text-slate-400">to</span>
                <input
                  type="time"
                  name={`hours-${day}-close`}
                  value={times[day].close}
                  onChange={(event) => setDayTime(day, "close", event.target.value)}
                  className={timeInputClasses}
                />
              </div>
            )}
            {status === "24h" && (
              <>
                <input type="hidden" name={`hours-${day}-open`} value={ALL_DAY_OPEN} />
                <input type="hidden" name={`hours-${day}-close`} value={ALL_DAY_CLOSE} />
              </>
            )}
            {day === "monday" && (
              <button
                type="button"
                onClick={copyMondayToWeekday}
                className="text-xs text-petrol hover:underline dark:text-petrol-light"
              >
                Copy to weekday
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

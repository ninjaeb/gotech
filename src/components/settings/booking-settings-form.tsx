"use client";

import { useState } from "react";
import { updateBookingSettings } from "@/app/actions/settings";
import { formatUtcOffset, type WeeklyHours } from "@/lib/booking";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/field";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOT_OPTIONS = [15, 30, 45, 60];
const UTC_OFFSET_OPTIONS = Array.from({ length: (840 - -720) / 30 + 1 }, (_, i) => -720 + i * 30);

export function BookingSettingsForm({
  initialUtcOffsetMinutes,
  initialSlotMinutes,
  initialWeeklyHours,
}: {
  initialUtcOffsetMinutes: number;
  initialSlotMinutes: number;
  initialWeeklyHours: WeeklyHours;
}) {
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>(initialWeeklyHours);
  const [utcOffsetMinutes, setUtcOffsetMinutes] = useState(initialUtcOffsetMinutes);
  const [slotMinutes, setSlotMinutes] = useState(initialSlotMinutes);

  function updateDay(index: number, patch: Partial<WeeklyHours[number]>) {
    setWeeklyHours((prev) => prev.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  }

  return (
    <form action={updateBookingSettings} className="space-y-4">
      <input type="hidden" name="weeklyHoursJson" value={JSON.stringify(weeklyHours)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="utcOffsetMinutes">Timezone</Label>
          <Select
            id="utcOffsetMinutes"
            name="utcOffsetMinutes"
            value={utcOffsetMinutes}
            onChange={(event) => setUtcOffsetMinutes(Number(event.target.value))}
          >
            {UTC_OFFSET_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {formatUtcOffset(minutes)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="slotMinutes">Call length</Label>
          <Select
            id="slotMinutes"
            name="slotMinutes"
            value={slotMinutes}
            onChange={(event) => setSlotMinutes(Number(event.target.value))}
          >
            {SLOT_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Weekly availability</Label>
        {weeklyHours.map((day, index) => (
          <div key={index} className="flex items-center gap-3 text-sm">
            <label className="flex w-32 shrink-0 items-center gap-2">
              <input
                type="checkbox"
                checked={day.enabled}
                onChange={(event) => updateDay(index, { enabled: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-neutral-700"
              />
              <span className="text-slate-700 dark:text-slate-300">{DAY_LABELS[index]}</span>
            </label>
            <input
              type="time"
              value={day.start}
              disabled={!day.enabled}
              onChange={(event) => updateDay(index, { start: event.target.value })}
              className="rounded-md border-0 px-2 py-1.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 disabled:opacity-40 dark:bg-neutral-900 dark:text-slate-100 dark:ring-neutral-700"
            />
            <span className="text-slate-400">to</span>
            <input
              type="time"
              value={day.end}
              disabled={!day.enabled}
              onChange={(event) => updateDay(index, { end: event.target.value })}
              className="rounded-md border-0 px-2 py-1.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 disabled:opacity-40 dark:bg-neutral-900 dark:text-slate-100 dark:ring-neutral-700"
            />
          </div>
        ))}
      </div>

      <Button type="submit">Save</Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { submitBooking } from "@/app/actions/bookings";
import { formatSlotLabel } from "@/lib/booking";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/field";

export function BookingForm({
  slots,
  utcOffsetMinutes,
}: {
  slots: { startAt: Date; endAt: Date }[];
  utcOffsetMinutes: number;
}) {
  const [state, formAction, pending] = useActionState(submitBooking, undefined);

  if (state?.status === "success") {
    return (
      <p className="rounded-md bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
        Booked! We&apos;ll see you then — a confirmation was noted on our end.
      </p>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="rounded-md bg-slate-100 px-4 py-3 text-center text-sm text-slate-600 dark:bg-neutral-800 dark:text-slate-300">
        No open slots right now — please check back soon.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Honeypot: hidden from real visitors, often filled in by bots. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="website">Leave this field blank</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <FieldGroup label="Pick a time" htmlFor="startAt" required>
        <Select id="startAt" name="startAt" required defaultValue="">
          <option value="" disabled>
            Select a slot…
          </option>
          {slots.map((slot) => (
            <option key={slot.startAt.toISOString()} value={slot.startAt.toISOString()}>
              {formatSlotLabel(slot.startAt, utcOffsetMinutes)}
            </option>
          ))}
        </Select>
      </FieldGroup>
      <FieldGroup label="Name" htmlFor="name" required>
        <Input id="name" name="name" required placeholder="Jane Smith" />
      </FieldGroup>
      <FieldGroup label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" required placeholder="jane@company.com" />
      </FieldGroup>
      <FieldGroup label="Phone" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" placeholder="Optional" />
      </FieldGroup>
      <FieldGroup label="What would you like to discuss?" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={3} placeholder="Optional" />
      </FieldGroup>

      {state?.status === "error" && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{state.message}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Booking…" : "Book call"}
      </Button>
    </form>
  );
}

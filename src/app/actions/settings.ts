"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setCurrency, setBookingSettings } from "@/lib/settings";
import { CURRENCY_CODES } from "@/lib/currency";
import type { WeeklyHours } from "@/lib/booking";
import { requireAdminAction } from "@/lib/auth/dal";

const currencySchema = z.enum(CURRENCY_CODES as [string, ...string[]]);

export async function updateCurrency(formData: FormData) {
  await requireAdminAction();
  const parsed = currencySchema.safeParse(formData.get("currency"));
  if (!parsed.success) {
    throw new Error("Invalid currency");
  }
  await setCurrency(parsed.data);
  revalidatePath("/", "layout");
}

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Invalid time");
const daySchema = z.object({ enabled: z.boolean(), start: timeSchema, end: timeSchema });
const bookingSettingsSchema = z.object({
  utcOffsetMinutes: z.coerce.number().int().min(-720).max(840),
  slotMinutes: z.coerce.number().int().positive(),
  weeklyHours: z.array(daySchema).length(7),
});

export async function updateBookingSettings(formData: FormData) {
  await requireAdminAction();
  let weeklyHours: unknown;
  try {
    weeklyHours = JSON.parse(String(formData.get("weeklyHoursJson") || "[]"));
  } catch {
    throw new Error("Weekly hours could not be read — try again.");
  }

  const parsed = bookingSettingsSchema.safeParse({
    utcOffsetMinutes: formData.get("utcOffsetMinutes"),
    slotMinutes: formData.get("slotMinutes"),
    weeklyHours,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid booking settings");
  }

  await setBookingSettings({
    utcOffsetMinutes: parsed.data.utcOffsetMinutes,
    slotMinutes: parsed.data.slotMinutes,
    weeklyHours: parsed.data.weeklyHours as WeeklyHours,
  });
  revalidatePath("/settings/forms");
  revalidatePath("/book");
}

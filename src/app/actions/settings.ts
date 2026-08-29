"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { setCurrency, setBookingSettings, setTaskReminderHour } from "@/lib/settings";
import { CURRENCY_CODES } from "@/lib/currency";
import type { WeeklyHours } from "@/lib/booking";
import { requireAdminAction } from "@/lib/auth/dal";
import { runTaskReminders, type TaskReminderRunResult } from "@/lib/task-reminder";
import { sendWhatsAppTemplateMessage, WHATSAPP_ACCOUNT_ID } from "@/lib/whatsapp";
import { getConfiguredSiteOrigin } from "@/lib/site-url";

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

const taskReminderHourSchema = z.coerce.number().int().min(0).max(23);

export async function updateTaskReminderHour(formData: FormData) {
  await requireAdminAction();
  const parsed = taskReminderHourSchema.safeParse(formData.get("taskReminderHour"));
  if (!parsed.success) {
    throw new Error("Invalid hour");
  }
  await setTaskReminderHour(parsed.data);
  revalidatePath("/settings/integrations");
}

// For the "Send now" button (Settings → Integrations) — troubleshooting a
// send without waiting for the configured hour or a user's 20h rate limit.
// Same send path as the cron script's --force flag (see
// src/lib/task-reminder.ts), so this can never behave differently. Takes
// the (prevState, formData) shape useActionState expects, even though
// neither is used, so the button component can call it directly.
export async function sendTaskRemindersNow(
  prevState: TaskReminderRunResult | undefined,
  formData: FormData,
): Promise<TaskReminderRunResult> {
  void prevState;
  void formData;
  await requireAdminAction();
  const result = await runTaskReminders({ force: true });
  revalidatePath("/settings/integrations");
  return result;
}

export type TaskDigestTemplateTestState = { error: string } | { success: true } | undefined;

// "Send test" button (Settings → Integrations) for the daily_task_digest
// template itself — separate from "Send now" above, which runs the real
// digest against real task data and skips anyone (the clicking admin
// included) who has nothing due. This always sends, with placeholder
// counts, to just the clicking admin's own number — the point is checking
// the template is approved and reachable, not reporting real task state.
export async function sendTaskDigestTemplateTest(
  prevState: TaskDigestTemplateTestState,
  formData: FormData,
): Promise<TaskDigestTemplateTestState> {
  void prevState;
  void formData;
  const admin = await requireAdminAction();

  const account = await db.whatsAppAccount.findUnique({ where: { id: WHATSAPP_ACCOUNT_ID } });
  if (!account) {
    return { error: "WhatsApp Business isn't connected." };
  }

  const { phone } = await db.user.findUniqueOrThrow({ where: { id: admin.id }, select: { phone: true } });
  if (!phone) {
    return { error: "Set your own WhatsApp number first, from Settings → Team." };
  }

  const siteOrigin = getConfiguredSiteOrigin();
  if (!siteOrigin) {
    return { error: "SITE_URL isn't set — see the README's WhatsApp task reminder section." };
  }

  const firstName = admin.name.trim().split(/\s+/)[0] || admin.name;
  try {
    await sendWhatsAppTemplateMessage(
      account,
      phone,
      "daily_task_digest",
      "en",
      [firstName, "2", "3", `${siteOrigin}/tasks?filter=due&assignee=${admin.id}`],
      [firstName],
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Send failed." };
  }
  return { success: true };
}

import { cache } from "react";
import { db } from "@/lib/db";
import { DEFAULT_WEEKLY_HOURS, parseWeeklyHours, type WeeklyHours } from "@/lib/booking";

const SETTINGS_ID = "singleton";

const DEFAULT_SETTINGS = {
  id: SETTINGS_ID,
  currency: "USD",
  bookingUtcOffsetMinutes: 480,
  bookingSlotMinutes: 30,
  bookingWeeklyHours: JSON.stringify(DEFAULT_WEEKLY_HOURS),
  taskReminderHour: 8,
  taskAssignmentNotificationDelayMinutes: 0,
};

export const getSettings = cache(async () => {
  const settings = await db.settings.findUnique({ where: { id: SETTINGS_ID } });
  return settings ?? DEFAULT_SETTINGS;
});

export async function getCurrency() {
  const settings = await getSettings();
  return settings.currency;
}

export async function setCurrency(currency: string) {
  await db.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, currency },
    update: { currency },
  });
}

export async function getBookingSettings() {
  const settings = await getSettings();
  return {
    utcOffsetMinutes: settings.bookingUtcOffsetMinutes,
    slotMinutes: settings.bookingSlotMinutes,
    weeklyHours: parseWeeklyHours(settings.bookingWeeklyHours),
  };
}

export async function setBookingSettings(data: {
  utcOffsetMinutes: number;
  slotMinutes: number;
  weeklyHours: WeeklyHours;
}) {
  const values = {
    bookingUtcOffsetMinutes: data.utcOffsetMinutes,
    bookingSlotMinutes: data.slotMinutes,
    bookingWeeklyHours: JSON.stringify(data.weeklyHours),
  };
  await db.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...values },
    update: values,
  });
}

// The local hour (0-23, in bookingUtcOffsetMinutes' timezone) the daily
// WhatsApp task reminder should send at — see
// scripts/send-task-digests-whatsapp.ts.
export async function getTaskReminderHour() {
  const settings = await getSettings();
  return settings.taskReminderHour;
}

export async function setTaskReminderHour(hour: number) {
  await db.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, taskReminderHour: hour },
    update: { taskReminderHour: hour },
  });
}

// How long (in minutes) to hold a task assignment notification before
// actually sending it — 0 sends immediately. See notifyTaskAssignment in
// src/app/actions/tasks.ts and PendingTaskAssignmentNotification.
export async function getTaskAssignmentNotificationDelayMinutes() {
  const settings = await getSettings();
  return settings.taskAssignmentNotificationDelayMinutes;
}

export async function setTaskAssignmentNotificationDelayMinutes(minutes: number) {
  await db.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, taskAssignmentNotificationDelayMinutes: minutes },
    update: { taskAssignmentNotificationDelayMinutes: minutes },
  });
}

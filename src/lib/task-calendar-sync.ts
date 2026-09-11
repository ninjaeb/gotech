import "server-only";

import { db } from "@/lib/db";
import { formatDateInput } from "@/lib/format";
import { getValidAccessToken, upsertCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";

// Keeps each assignee's Google Calendar in step with one Task — called
// (best-effort, never throws) after every Task create/update/complete-
// toggle from src/app/actions/tasks.ts. Nothing here is awaited by the
// caller for its result; a sync failure is recorded on the relevant
// GoogleCalendarAccount (surfaced on the Settings page) rather than ever
// failing the task save itself.
//
// Only assignees who've connected their own Google account (see
// src/app/actions/google-calendar.ts) get an event — everyone else is
// silently skipped, not an error.

async function recordSyncError(accountId: string, message: string) {
  await db.googleCalendarAccount.update({ where: { id: accountId }, data: { lastSyncError: message } }).catch(() => {});
}

async function clearSyncError(accountId: string) {
  await db.googleCalendarAccount.update({ where: { id: accountId }, data: { lastSyncError: null } }).catch(() => {});
}

// Deletes one task/assignee's event off Google (if their account is still
// connected) and its own bookkeeping row either way — an account that's
// been disconnected has nothing to delete against, so the row is just
// dropped.
async function removeCalendarEvent(event: { id: string; userId: string; googleEventId: string }) {
  const account = await db.googleCalendarAccount.findUnique({ where: { userId: event.userId } });
  if (account) {
    try {
      const accessToken = await getValidAccessToken(account);
      await deleteCalendarEvent({ accessToken, eventId: event.googleEventId });
      await clearSyncError(account.id);
    } catch (error) {
      await recordSyncError(account.id, error instanceof Error ? error.message : String(error));
      // Still drop the row below — an event we can no longer manage is
      // better forgotten than blocking every future sync on it forever.
    }
  }
  await db.taskCalendarEvent.delete({ where: { id: event.id } }).catch(() => {});
}

async function upsertCalendarEventForAssignee(
  task: { id: string; title: string; description: string | null; dueDate: Date },
  userId: string,
  existing: { id: string; googleEventId: string } | undefined,
) {
  const account = await db.googleCalendarAccount.findUnique({ where: { userId } });
  if (!account) return;
  try {
    const accessToken = await getValidAccessToken(account);
    const googleEventId = await upsertCalendarEvent({
      accessToken,
      eventId: existing?.googleEventId,
      taskId: task.id,
      summary: task.title,
      description: task.description,
      date: formatDateInput(task.dueDate),
    });
    if (existing) {
      await db.taskCalendarEvent.update({ where: { id: existing.id }, data: { googleEventId } });
    } else {
      await db.taskCalendarEvent.create({ data: { taskId: task.id, userId, googleEventId } });
    }
    await clearSyncError(account.id);
  } catch (error) {
    await recordSyncError(account.id, error instanceof Error ? error.message : String(error));
  }
}

// A task only ever shows on a calendar while it has a due date to place it
// on and isn't done yet — completing it (or clearing its due date) removes
// the event the same as unassigning someone does, rather than leaving a
// stale entry behind.
export async function syncTaskCalendarEvents(taskId: string): Promise<void> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, description: true, dueDate: true, completed: true, assignees: { select: { userId: true } } },
  });
  if (!task) return;

  const assigneeIds = new Set(task.assignees.map((a) => a.userId));
  const existingEvents = await db.taskCalendarEvent.findMany({ where: { taskId } });
  const shouldHaveEvent = Boolean(task.dueDate) && !task.completed;

  for (const event of existingEvents) {
    if (!shouldHaveEvent || !assigneeIds.has(event.userId)) {
      await removeCalendarEvent(event);
    }
  }
  if (!shouldHaveEvent) return;

  for (const userId of assigneeIds) {
    const existing = existingEvents.find((event) => event.userId === userId);
    await upsertCalendarEventForAssignee(
      { id: task.id, title: task.title, description: task.description, dueDate: task.dueDate! },
      userId,
      existing,
    );
  }
}

// Called from deleteTask before the Task row itself is deleted — once it's
// gone, the cascading foreign key drops every TaskCalendarEvent row before
// this could read them, taking the record of which Google events to delete
// with it.
export async function deleteTaskCalendarEvents(taskId: string): Promise<void> {
  const events = await db.taskCalendarEvent.findMany({ where: { taskId } });
  for (const event of events) {
    await removeCalendarEvent(event);
  }
}

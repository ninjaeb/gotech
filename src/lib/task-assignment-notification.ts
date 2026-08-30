import { db } from "@/lib/db";
import { getTaskAssignmentNotificationDelayMinutes } from "@/lib/settings";
import { notifyTaskAssignmentViaWhatsApp } from "@/lib/whatsapp";

// Either sends the task assignment notification (in-app + WhatsApp) right
// now, or — if Settings → Integrations has a delay configured — schedules
// it as a PendingTaskAssignmentNotification row for the cron job
// (scripts/sync-email.ts) to pick up once it's due. `recipientIds` is
// already filtered to exclude the assigner themselves (see
// notifyTaskAssignment in src/app/actions/tasks.ts).
export async function scheduleOrSendTaskAssignmentNotification(
  taskId: string,
  taskTitle: string,
  recipientIds: string[],
  assignerId: string,
  assignerName: string,
): Promise<void> {
  if (recipientIds.length === 0) return;

  const delayMinutes = await getTaskAssignmentNotificationDelayMinutes();
  if (delayMinutes === 0) {
    await sendTaskAssignmentNotification(taskId, taskTitle, recipientIds, assignerName);
    return;
  }

  const sendAt = new Date(Date.now() + delayMinutes * 60_000);
  // Upsert rather than create — re-assigning someone who already has a
  // pending notification for this exact task just pushes sendAt out
  // instead of queuing a second one.
  await Promise.all(
    recipientIds.map((userId) =>
      db.pendingTaskAssignmentNotification.upsert({
        where: { taskId_userId: { taskId, userId } },
        create: { taskId, userId, assignerId, assignerName, taskTitle, sendAt },
        update: { assignerId, assignerName, taskTitle, sendAt },
      }),
    ),
  );
}

// Called when someone is un-assigned from a task before their delayed
// notification ever fired — e.g. added by mistake and removed a minute
// later. Never throws on a row that doesn't exist (deleteMany, not
// delete), since most un-assignments have no pending row to clean up.
export async function cancelPendingTaskAssignmentNotifications(taskId: string, userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  await db.pendingTaskAssignmentNotification.deleteMany({ where: { taskId, userId: { in: userIds } } });
}

// Shared by both the immediate path above and the cron-drained delayed
// path below — the same in-app Notification + WhatsApp send either way.
async function sendTaskAssignmentNotification(
  taskId: string,
  taskTitle: string,
  recipientIds: string[],
  assignerName: string,
): Promise<void> {
  const content = `${assignerName} assigned you a task: ${taskTitle}`;
  await db.notification.createMany({
    data: recipientIds.map((userId) => ({ userId, taskId, content })),
  });
  await notifyTaskAssignmentViaWhatsApp(recipientIds, assignerName, taskTitle, `/tasks/${taskId}`);
}

// Cron entrypoint (see scripts/sync-email.ts) — sends every pending
// notification whose delay has elapsed, then clears those rows. A task or
// user deleted in the meantime just cascades its row away before this ever
// runs, so nothing here needs to re-check either still exists.
export async function sendDuePendingTaskAssignmentNotifications(): Promise<{ sent: number; failed: number }> {
  const due = await db.pendingTaskAssignmentNotification.findMany({ where: { sendAt: { lte: new Date() } } });
  let sent = 0;
  let failed = 0;
  for (const pending of due) {
    try {
      await sendTaskAssignmentNotification(pending.taskId, pending.taskTitle, [pending.userId], pending.assignerName);
      await db.pendingTaskAssignmentNotification.delete({ where: { id: pending.id } });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(
        `Delayed task assignment notification failed for pending notification ${pending.id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  return { sent, failed };
}

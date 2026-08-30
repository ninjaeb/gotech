import "dotenv/config";
import { db } from "../src/lib/db";
import { syncEmailAccount } from "../src/lib/email";
import { runEmailTaskDigests } from "../src/lib/task-digest";
import { runTaskReminders } from "../src/lib/task-reminder";
import { sendDuePendingTaskAssignmentNotifications } from "../src/lib/task-assignment-notification";

// The one cron job (see README) this app actually needs: syncs every
// connected mailbox, then checks both daily digests (email and WhatsApp),
// then sends any delayed task-assignment notifications that have come due.
// Both digest runners are internally rate-limited (roughly once per 20h,
// and the WhatsApp one also checks its own configured send hour) so it's
// safe — and intended — to check them on every run of this same frequent
// (e.g. every 10 minutes) schedule, rather than needing their own separate
// cron entries. Each phase is independent: a failure syncing mail, or a
// bug in one digest, still lets the others run.
async function main() {
  const accounts = await db.emailAccount.findMany({ include: { user: { select: { email: true } } } });
  if (accounts.length === 0) {
    console.log("No connected mailboxes to sync.");
  } else {
    for (const account of accounts) {
      try {
        const { logged } = await syncEmailAccount(account);
        console.log(`${account.user.email}: synced, ${logged} new email(s) logged.`);
      } catch (error) {
        console.error(`${account.user.email}: sync failed —`, error instanceof Error ? error.message : error);
      }
    }
  }

  try {
    const emailDigest = await runEmailTaskDigests();
    for (const { email, taskCount } of emailDigest.sent) {
      console.log(`${email}: sent email digest, ${taskCount} task(s).`);
    }
    for (const { email, reason } of emailDigest.skipped) {
      console.log(`${email}: ${reason} — no digest email sent.`);
    }
    for (const { email, error } of emailDigest.failed) {
      console.error(`${email}: digest send failed — ${error}`);
    }
  } catch (error) {
    console.error("Email task digest run failed —", error instanceof Error ? error.message : error);
  }

  try {
    const whatsAppDigest = await runTaskReminders();
    if (!whatsAppDigest.ok) {
      console.log(`${whatsAppDigest.message} Nothing to digest.`);
    } else {
      for (const { name, overdueCount, dueTodayCount } of whatsAppDigest.sent) {
        console.log(`${name}: sent WhatsApp digest, ${overdueCount} overdue / ${dueTodayCount} due today.`);
      }
      for (const { name, reason } of whatsAppDigest.skipped) {
        console.log(`${name}: ${reason} — no WhatsApp message sent.`);
      }
      for (const { name, error } of whatsAppDigest.failed) {
        console.error(`${name}: WhatsApp digest send failed — ${error}`);
      }
    }
  } catch (error) {
    console.error("WhatsApp task digest run failed —", error instanceof Error ? error.message : error);
  }

  try {
    const { sent, failed } = await sendDuePendingTaskAssignmentNotifications();
    if (sent > 0 || failed > 0) {
      console.log(`Delayed task assignment notifications: ${sent} sent, ${failed} failed.`);
    }
  } catch (error) {
    console.error("Delayed task assignment notification run failed —", error instanceof Error ? error.message : error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

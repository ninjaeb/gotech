import "dotenv/config";
import { db } from "../src/lib/db";
import { sendEmailViaAccount } from "../src/lib/email";
import { buildDigestSubject, buildDigestText, type DigestTask } from "../src/lib/task-digest";

// Run on a schedule (cPanel Cron Job — see README) — once a day is right;
// lastDigestSentAt below rate-limits actual sends to roughly once every 20h
// regardless of how often this script itself gets invoked, so a more
// frequent cron (or a manual re-run) won't double-send.
const MIN_HOURS_BETWEEN_SENDS = 20;

async function main() {
  const accounts = await db.emailAccount.findMany({ include: { user: { select: { id: true, email: true } } } });
  if (accounts.length === 0) {
    console.log("No connected mailboxes — nothing to digest.");
    return;
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  for (const account of accounts) {
    if (account.lastDigestSentAt) {
      const hoursSinceLastSend = (now.getTime() - account.lastDigestSentAt.getTime()) / 3_600_000;
      if (hoursSinceLastSend < MIN_HOURS_BETWEEN_SENDS) {
        console.log(`${account.email}: sent ${hoursSinceLastSend.toFixed(1)}h ago, skipping.`);
        continue;
      }
    }

    const tasks: DigestTask[] = await db.task.findMany({
      where: {
        assignees: { some: { userId: account.userId } },
        completed: false,
        dueDate: { lt: endOfToday },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      include: {
        contact: { select: { firstName: true, lastName: true } },
        company: { select: { name: true } },
        deal: { select: { title: true } },
        project: { select: { name: true } },
      },
    });

    if (tasks.length === 0) {
      console.log(`${account.email}: nothing due — no email sent.`);
      continue;
    }

    try {
      await sendEmailViaAccount(account, {
        to: account.email,
        subject: buildDigestSubject(tasks),
        text: buildDigestText(tasks, startOfToday),
      });
      await db.emailAccount.update({ where: { id: account.id }, data: { lastDigestSentAt: now } });
      console.log(`${account.email}: sent digest, ${tasks.length} task(s).`);
    } catch (error) {
      console.error(`${account.email}: digest send failed —`, error instanceof Error ? error.message : error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

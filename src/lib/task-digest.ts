import type { Company, Contact, Deal, Project, Task } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { sendEmailViaAccount } from "@/lib/email";
import { formatDate } from "@/lib/format";

export type DigestTask = Task & {
  contact: Pick<Contact, "firstName" | "lastName"> | null;
  company: Pick<Company, "name"> | null;
  deal: Pick<Deal, "title"> | null;
  project: Pick<Project, "name"> | null;
};

function describeParent(task: DigestTask): string | null {
  if (task.deal) return `Deal: ${task.deal.title}`;
  if (task.project) return `Project: ${task.project.name}`;
  if (task.contact) {
    const name = [task.contact.firstName, task.contact.lastName].filter(Boolean).join(" ");
    return name ? `Contact: ${name}` : null;
  }
  if (task.company) return `Company: ${task.company.name}`;
  return null;
}

function describeTask(task: DigestTask): string {
  const parent = describeParent(task);
  return `  - ${task.title}${parent ? ` (${parent})` : ""}`;
}

// Plain text on purpose — this goes out over whatever SMTP server the
// recipient connected, so it should render fine everywhere without relying
// on an HTML renderer. No links back into the CRM either: building one
// would need a site-URL env var this app otherwise has no reason to
// require, for every deployment, just for this.
export function buildDigestText(tasks: DigestTask[], startOfToday: Date): string {
  const overdue = tasks.filter((task) => task.dueDate && task.dueDate < startOfToday);
  const dueToday = tasks.filter((task) => task.dueDate && task.dueDate >= startOfToday);

  const sections: string[] = [];
  if (overdue.length > 0) {
    sections.push(`Overdue (${overdue.length}):\n${overdue.map(describeTask).join("\n")}`);
  }
  if (dueToday.length > 0) {
    sections.push(`Due today (${dueToday.length}):\n${dueToday.map(describeTask).join("\n")}`);
  }

  return [
    `You have ${tasks.length} task${tasks.length === 1 ? "" : "s"} that ${tasks.length === 1 ? "needs" : "need"} attention as of ${formatDate(startOfToday)}.`,
    "",
    ...sections,
    "",
    "This is your daily task digest from GoTech CRM.",
  ].join("\n");
}

export function buildDigestSubject(tasks: DigestTask[]): string {
  return `${tasks.length} task${tasks.length === 1 ? "" : "s"} due today or overdue`;
}

// Shared by scripts/send-task-digests.ts (a manual/troubleshooting
// entrypoint) and sync-email.ts (the actual cron entrypoint, which runs
// this right after syncing mail) — one send path, so the two can never
// drift apart. Mirrors runTaskReminders in src/lib/task-reminder.ts, the
// WhatsApp equivalent.

// Rate-limits actual sends to roughly once every 20h per mailbox
// regardless of how often this gets invoked — safe to check on a cron far
// more frequent than daily, which is what lets it ride along on
// sync-email's schedule instead of needing its own.
const MIN_HOURS_BETWEEN_SENDS = 20;

export type EmailDigestRunResult = {
  sent: { email: string; taskCount: number }[];
  skipped: { email: string; reason: string }[];
  failed: { email: string; error: string }[];
};

export async function runEmailTaskDigests(): Promise<EmailDigestRunResult> {
  const result: EmailDigestRunResult = { sent: [], skipped: [], failed: [] };

  const accounts = await db.emailAccount.findMany({ include: { user: { select: { id: true, email: true } } } });
  if (accounts.length === 0) return result;

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  for (const account of accounts) {
    if (account.lastDigestSentAt) {
      const hoursSinceLastSend = (now.getTime() - account.lastDigestSentAt.getTime()) / 3_600_000;
      if (hoursSinceLastSend < MIN_HOURS_BETWEEN_SENDS) {
        result.skipped.push({ email: account.email, reason: `sent ${hoursSinceLastSend.toFixed(1)}h ago` });
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
      result.skipped.push({ email: account.email, reason: "nothing due" });
      continue;
    }

    try {
      await sendEmailViaAccount(account, {
        to: account.email,
        subject: buildDigestSubject(tasks),
        text: buildDigestText(tasks, startOfToday),
      });
      await db.emailAccount.update({ where: { id: account.id }, data: { lastDigestSentAt: now } });
      result.sent.push({ email: account.email, taskCount: tasks.length });
    } catch (error) {
      result.failed.push({ email: account.email, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return result;
}

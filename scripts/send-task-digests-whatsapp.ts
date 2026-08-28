import "dotenv/config";
import { db } from "../src/lib/db";
import { sendWhatsAppTemplateMessage } from "../src/lib/whatsapp";
import { getConfiguredSiteOrigin } from "../src/lib/site-url";
import type { DigestTask } from "../src/lib/task-digest";

// Run on a schedule (cPanel Cron Job — see README) — once a day, in the
// morning, is the point. lastTaskDigestWhatsAppSentAt below rate-limits
// actual sends to roughly once every 20h regardless of how often this
// script itself gets invoked, mirroring send-task-digests.ts's email
// version, so a more frequent cron (or a manual re-run) won't double-send.
const MIN_HOURS_BETWEEN_SENDS = 20;

// Must match an approved template in Meta Business Manager exactly — see
// the README's WhatsApp section for the exact text to submit. Sent as a
// template (not plain text) because this is a proactive, business-initiated
// message: most recipients won't be within WhatsApp's 24h reply window, and
// a template is the only message type Meta allows outside it.
const TEMPLATE_NAME = "daily_task_digest";
const TEMPLATE_LANGUAGE = "en";

async function main() {
  const whatsAppAccount = await db.whatsAppAccount.findUnique({ where: { id: "singleton" } });
  if (!whatsAppAccount) {
    console.log("WhatsApp Business isn't connected (Settings → Integrations) — nothing to digest.");
    return;
  }

  // The template links back to the user's own task list, which needs an
  // absolute URL — and unlike a request handler, a cron-run CLI script has
  // no incoming Host header to build one from (see getConfiguredSiteOrigin).
  const siteOrigin = getConfiguredSiteOrigin();
  if (!siteOrigin) {
    console.log("SITE_URL isn't set (see README's WhatsApp task reminder section) — nothing to digest.");
    return;
  }

  const users = await db.user.findMany({ where: { phone: { not: null } } });
  if (users.length === 0) {
    console.log("No one has a phone number set (Settings → Team) — nothing to digest.");
    return;
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  for (const user of users) {
    if (user.lastTaskDigestWhatsAppSentAt) {
      const hoursSinceLastSend = (now.getTime() - user.lastTaskDigestWhatsAppSentAt.getTime()) / 3_600_000;
      if (hoursSinceLastSend < MIN_HOURS_BETWEEN_SENDS) {
        console.log(`${user.name}: sent ${hoursSinceLastSend.toFixed(1)}h ago, skipping.`);
        continue;
      }
    }

    const tasks: DigestTask[] = await db.task.findMany({
      where: {
        assignees: { some: { userId: user.id } },
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
      console.log(`${user.name}: nothing due — no WhatsApp message sent.`);
      continue;
    }

    const overdueCount = tasks.filter((task) => task.dueDate && task.dueDate < startOfToday).length;
    const dueTodayCount = tasks.length - overdueCount;
    const firstName = user.name.trim().split(/\s+/)[0] || user.name;
    const taskListUrl = `${siteOrigin}/tasks?assignee=${user.id}`;

    try {
      await sendWhatsAppTemplateMessage(whatsAppAccount, user.phone!, TEMPLATE_NAME, TEMPLATE_LANGUAGE, [
        firstName,
        String(overdueCount),
        String(dueTodayCount),
        taskListUrl,
      ]);
      await db.user.update({ where: { id: user.id }, data: { lastTaskDigestWhatsAppSentAt: now } });
      console.log(
        `${user.name}: sent WhatsApp digest, ${overdueCount} overdue / ${dueTodayCount} due today.`,
      );
    } catch (error) {
      console.error(`${user.name}: WhatsApp digest send failed —`, error instanceof Error ? error.message : error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

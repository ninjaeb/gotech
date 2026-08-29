import { db } from "@/lib/db";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp";
import { getConfiguredSiteOrigin } from "@/lib/site-url";
import { getBookingSettings, getTaskReminderHour } from "@/lib/settings";
import type { DigestTask } from "@/lib/task-digest";

// Shared by scripts/sync-email.ts (the cron entrypoint), the manual/
// troubleshooting scripts/send-task-digests-whatsapp.ts, and the "Send now"
// button in Settings → Integrations — one send path, so none of the three
// can ever drift apart.

// Rate-limits actual sends to roughly once every 20h per user regardless of
// how often this gets invoked, mirroring runEmailTaskDigests in
// src/lib/task-digest.ts — but not force's job to ignore, see below.
const MIN_HOURS_BETWEEN_SENDS = 20;

// Must match an approved template in Meta Business Manager exactly — see
// the README's WhatsApp section for the exact text to submit. Sent as a
// template (not plain text) because this is a proactive, business-initiated
// message: most recipients won't be within WhatsApp's 24h reply window, and
// a template is the only message type Meta allows outside it.
export const TEMPLATE_NAME = "_daily_task_digest_v2";
const TEMPLATE_LANGUAGE = "en";

export type TaskReminderRunResult = {
  // False only when nothing could run at all (no WhatsApp account, no
  // SITE_URL, no opted-in users, or — unless forced — it's not the
  // configured hour). `sent`/`skipped`/`failed` are always meaningful even
  // when true but empty (e.g. everyone already had nothing due).
  ok: boolean;
  message: string;
  sent: { name: string; overdueCount: number; dueTodayCount: number }[];
  skipped: { name: string; reason: string }[];
  failed: { name: string; error: string }[];
};

// force=true is "send right now regardless" — used by the CLI's --force
// flag and the Settings "Send now" button alike. It skips both the
// configured-send-hour gate below and each user's own 20h rate limit, since
// the whole point of forcing a send is to see a message land immediately
// for troubleshooting, not to wait out a throttle meant for the unattended
// cron path.
export async function runTaskReminders({ force = false }: { force?: boolean } = {}): Promise<TaskReminderRunResult> {
  const empty: Pick<TaskReminderRunResult, "sent" | "skipped" | "failed"> = { sent: [], skipped: [], failed: [] };

  const whatsAppAccount = await db.whatsAppAccount.findUnique({ where: { id: "singleton" } });
  if (!whatsAppAccount) {
    return { ok: false, message: "WhatsApp Business isn't connected (Settings → Integrations).", ...empty };
  }

  // The template links back to the user's own task list, which needs an
  // absolute URL — and unlike a request handler, the cron-run CLI script
  // has no incoming Host header to build one from (see
  // getConfiguredSiteOrigin). The web-triggered "Send now" path reuses the
  // same env var rather than the request's own host, so both paths always
  // produce the identical link.
  const siteOrigin = getConfiguredSiteOrigin();
  if (!siteOrigin) {
    return { ok: false, message: "SITE_URL isn't set — see the README's WhatsApp task reminder section.", ...empty };
  }

  const users = await db.user.findMany({ where: { phone: { not: null } } });
  if (users.length === 0) {
    return { ok: false, message: "No one has a phone number set (Settings → Team).", ...empty };
  }

  const now = new Date();

  if (!force) {
    const [{ utcOffsetMinutes }, targetHour] = await Promise.all([getBookingSettings(), getTaskReminderHour()]);
    const localHour = new Date(now.getTime() + utcOffsetMinutes * 60_000).getUTCHours();
    if (localHour !== targetHour) {
      return {
        ok: false,
        message: `Configured to send at ${targetHour}:00 (Settings → Integrations), it's ${localHour}:00 there now.`,
        ...empty,
      };
    }
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const result: TaskReminderRunResult = { ok: true, message: "", sent: [], skipped: [], failed: [] };

  for (const user of users) {
    if (!force && user.lastTaskDigestWhatsAppSentAt) {
      const hoursSinceLastSend = (now.getTime() - user.lastTaskDigestWhatsAppSentAt.getTime()) / 3_600_000;
      if (hoursSinceLastSend < MIN_HOURS_BETWEEN_SENDS) {
        result.skipped.push({ name: user.name, reason: `sent ${hoursSinceLastSend.toFixed(1)}h ago` });
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
      result.skipped.push({ name: user.name, reason: "nothing due" });
      continue;
    }

    const overdueCount = tasks.filter((task) => task.dueDate && task.dueDate < startOfToday).length;
    const dueTodayCount = tasks.length - overdueCount;
    const firstName = user.name.trim().split(/\s+/)[0] || user.name;
    // filter=due is the Tasks page's combined overdue+due-today view (see
    // buildWhere in the Tasks page) — lands exactly on what overdueCount/
    // dueTodayCount above just reported, not the broader "Open" tab.
    const taskListUrl = `${siteOrigin}/tasks?filter=due&assignee=${user.id}`;

    try {
      // The approved template's own Header greets by name too (its own
      // {{1}}, numbered independently of the body's) — see the README.
      await sendWhatsAppTemplateMessage(
        whatsAppAccount,
        user.phone!,
        TEMPLATE_NAME,
        TEMPLATE_LANGUAGE,
        [firstName, String(overdueCount), String(dueTodayCount), taskListUrl],
        [firstName],
      );
      await db.user.update({ where: { id: user.id }, data: { lastTaskDigestWhatsAppSentAt: now } });
      result.sent.push({ name: user.name, overdueCount, dueTodayCount });
    } catch (error) {
      result.failed.push({ name: user.name, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return result;
}

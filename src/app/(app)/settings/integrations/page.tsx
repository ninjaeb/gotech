import { requireAdmin, getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getSiteOrigin } from "@/lib/site-url";
import { getBookingSettings, getTaskReminderHour, getTaskAssignmentNotificationDelayMinutes } from "@/lib/settings";
import { formatUtcOffset } from "@/lib/booking";
import { TASK_ASSIGNMENT_DELAY_OPTIONS_MINUTES, formatDelayLabel } from "@/lib/task-notification-delay";
import { updateTaskReminderHour, updateTaskAssignmentNotificationDelay } from "@/app/actions/settings";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { EmailAccountForm } from "@/components/settings/email-account-form";
import { WhatsAppAccountForm } from "@/components/settings/whatsapp-account-form";
import { SendTaskReminderNowButton } from "@/components/settings/send-task-reminder-now-button";
import { SendTaskDigestTemplateTestButton } from "@/components/settings/send-task-digest-template-test-button";
import { SendMentionNotificationTestButton } from "@/components/settings/send-mention-notification-test-button";
import { SendMentionReplyNotificationTestButton } from "@/components/settings/send-mention-reply-notification-test-button";
import { SendTaskAssignmentNotificationTestButton } from "@/components/settings/send-task-assignment-notification-test-button";
import { SendTaskStatusNotificationTestButton } from "@/components/settings/send-task-status-notification-test-button";

// e.g. 0 -> "12:00 AM", 13 -> "1:00 PM" — a stable, locale-independent label
// for the hour <select>, same reasoning as booking.ts's formatSlotLabel.
function formatHourLabel(hour: number) {
  const period = hour < 12 ? "AM" : "PM";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour}:00 ${period}`;
}

export default async function IntegrationsSettingsPage() {
  await requireAdmin();
  const currentUser = await getCurrentUser();
  const [siteOrigin, emailAccount, whatsAppAccount, bookingSettings, taskReminderHour, taskAssignmentNotificationDelayMinutes] =
    await Promise.all([
      getSiteOrigin(),
      db.emailAccount.findUnique({
        where: { userId: currentUser.id },
        select: { email: true, lastSyncedAt: true, lastSyncError: true, fromName: true, htmlSignature: true },
      }),
      db.whatsAppAccount.findUnique({
        where: { id: "singleton" },
        select: { phoneNumberId: true, displayPhoneNumber: true, webhookVerifyToken: true, lastSyncError: true },
      }),
      getBookingSettings(),
      getTaskReminderHour(),
      getTaskAssignmentNotificationDelayMinutes(),
    ]);
  const whatsAppWebhookUrl = `${siteOrigin}/api/whatsapp/webhook`;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Integrations" }]}
        title="Integrations"
        description="Connect the outside services the CRM sends through"
      />
      <Card>
        <CardHeader>
          <CardTitle>Connect your email</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Personal, not shared — this is your own inbox. New mail to/from an address that matches a
            Contact gets logged automatically, and you can send from here too. Runs on a schedule (see the
            README&apos;s cron job setup) plus whenever you hit Sync now.
          </p>
          <EmailAccountForm account={emailAccount} currentUserName={currentUser.name} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Business</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Shared across the whole team — one Business phone number, unlike email. Messages to/from a number that
            matches a Contact get logged automatically, and you can send from here too.
          </p>
          <WhatsAppAccountForm account={whatsAppAccount} webhookUrl={whatsAppWebhookUrl} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily WhatsApp task reminder</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            What time each opted-in user gets their reminder — see Settings → Team to set a user&apos;s
            phone number, and the README for the cron job and Meta template this needs. In the same
            timezone as the booking scheduler ({formatUtcOffset(bookingSettings.utcOffsetMinutes)}).
          </p>
          <form action={updateTaskReminderHour} className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="taskReminderHour">Send at</Label>
              <Select
                key={taskReminderHour}
                id="taskReminderHour"
                name="taskReminderHour"
                defaultValue={taskReminderHour}
                className="w-40"
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>
                    {formatHourLabel(hour)}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">Save</Button>
          </form>
          <div className="grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2 dark:border-neutral-800">
            <div>
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                Send the real digest to everyone opted in, right now — ignoring the send-hour above and
                each person&apos;s once-a-day limit.
              </p>
              <SendTaskReminderNowButton />
            </div>
            <div>
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                Just checking the template itself works? Send a test with placeholder counts to your own
                number only — skips everyone else and the per-user due-task lookup.
              </p>
              <SendTaskDigestTemplateTestButton />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp @mention notifications</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Sent automatically whenever someone is @mentioned in a note or task, to anyone mentioned
              who&apos;s also set a phone number (Settings → Team). No schedule to check here — use this to
              confirm the Meta template is approved and working, sent to your own number.
            </p>
            <SendMentionNotificationTestButton />
          </div>
          <div className="border-t border-slate-200 pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4 dark:border-neutral-800">
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Swipe-to-reply on that WhatsApp notification and the reply is forwarded back to whoever
              mentioned them, and logged in the CRM on the same note or task. Also needs its own approved
              template — use this to confirm it&apos;s working.
            </p>
            <SendMentionReplyNotificationTestButton />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp task assignment notifications</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Sent automatically whenever a task gets a new assignee, to anyone assigned who&apos;s also set a
            phone number (Settings → Team).
          </p>
          <form action={updateTaskAssignmentNotificationDelay} className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="delayMinutes">Send after</Label>
              <Select
                key={taskAssignmentNotificationDelayMinutes}
                id="delayMinutes"
                name="delayMinutes"
                defaultValue={taskAssignmentNotificationDelayMinutes}
                className="w-40"
              >
                {TASK_ASSIGNMENT_DELAY_OPTIONS_MINUTES.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {formatDelayLabel(minutes)}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">Save</Button>
          </form>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            A delay gives you time to tell someone about a task in person or Slack first, without a
            duplicate CRM ping right after — the notification still fires on schedule even if you edit the
            task again in the meantime, unless you remove them as an assignee before it does. No schedule
            to check here for the test below — it sends immediately, ignoring the delay above, to confirm
            the Meta template is approved and working.
          </p>
          <SendTaskAssignmentNotificationTestButton />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp task status notifications</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Sent automatically whenever a task you&apos;re following (but not necessarily assigned to) gets
            marked complete or reopened, to anyone following who&apos;s also set a phone number (Settings →
            Team). Assigning someone a task automatically follows it for you too, so you hear about it when
            its status changes later. No schedule to check here — use this to confirm the Meta template is
            approved and working, sent to your own number.
          </p>
          <SendTaskStatusNotificationTestButton />
        </CardBody>
      </Card>
    </div>
  );
}

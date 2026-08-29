import { requireAdmin, getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getSiteOrigin } from "@/lib/site-url";
import { getBookingSettings, getTaskReminderHour } from "@/lib/settings";
import { formatUtcOffset } from "@/lib/booking";
import { updateTaskReminderHour } from "@/app/actions/settings";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { EmailAccountForm } from "@/components/settings/email-account-form";
import { WhatsAppAccountForm } from "@/components/settings/whatsapp-account-form";

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
  const [siteOrigin, emailAccount, whatsAppAccount, bookingSettings, taskReminderHour] = await Promise.all([
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
          <form action={updateTaskReminderHour} className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="taskReminderHour">Send at</Label>
              <Select id="taskReminderHour" name="taskReminderHour" defaultValue={taskReminderHour} className="w-40">
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>
                    {formatHourLabel(hour)}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

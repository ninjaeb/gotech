import { requireAdmin, getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getSiteOrigin } from "@/lib/site-url";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailAccountForm } from "@/components/settings/email-account-form";
import { WhatsAppAccountForm } from "@/components/settings/whatsapp-account-form";

export default async function IntegrationsSettingsPage() {
  await requireAdmin();
  const currentUser = await getCurrentUser();
  const [siteOrigin, emailAccount, whatsAppAccount] = await Promise.all([
    getSiteOrigin(),
    db.emailAccount.findUnique({
      where: { userId: currentUser.id },
      select: { email: true, lastSyncedAt: true, lastSyncError: true, fromName: true, htmlSignature: true },
    }),
    db.whatsAppAccount.findUnique({
      where: { id: "singleton" },
      select: { phoneNumberId: true, displayPhoneNumber: true, webhookVerifyToken: true, lastSyncError: true },
    }),
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
    </div>
  );
}

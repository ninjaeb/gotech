import { getCurrency } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { CurrencyForm } from "@/components/settings/currency-form";
import { SettingsLinkCard } from "@/components/settings/settings-link-card";
import { InstallAppCard } from "@/components/settings/install-app-card";

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();
  const canManage = currentUser.role === "ADMIN";
  const currency = await getCurrency();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="CRM-wide preferences" />

      <InstallAppCard />

      {canManage && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Currency</CardTitle>
            </CardHeader>
            <CardBody>
              <CurrencyForm currency={currency} />
            </CardBody>
          </Card>

          <SettingsLinkCard
            href="/settings/sales"
            title="Sales"
            description="Pipelines, product & service catalog, quote templates, sequences."
          />
          <SettingsLinkCard
            href="/settings/team"
            title="Team"
            description="Manage logins, roles, and billing rates."
          />
          <SettingsLinkCard
            href="/settings/forms"
            title="Forms & Booking"
            description="The public lead-capture form and meeting scheduler."
          />
          <SettingsLinkCard
            href="/settings/integrations"
            title="Integrations"
            description="Connect email and the shared WhatsApp Business number."
          />
        </>
      )}

      <SettingsLinkCard
        href="/settings/changelog"
        title="Changelog"
        description="See what's new — every feature and change, with version and date."
      />

      <Card>
        <CardHeader>
          <CardTitle>Change your password</CardTitle>
        </CardHeader>
        <CardBody>
          <ChangePasswordForm />
        </CardBody>
      </Card>
    </div>
  );
}

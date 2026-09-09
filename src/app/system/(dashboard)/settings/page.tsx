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
            href="/system/settings/sales"
            title="Sales"
            description="Pipelines, product & service catalog, quote templates, sequences."
          />
          <SettingsLinkCard
            href="/system/settings/team"
            title="Team"
            description="Manage logins, roles, and billing rates."
          />
          <SettingsLinkCard
            href="/system/settings/forms"
            title="Forms & Booking"
            description="The public lead-capture form and meeting scheduler."
          />
          <SettingsLinkCard
            href="/system/settings/referrals"
            title="Referrals"
            description="Partner commission rate and the landing page referral links send visitors to."
          />
          <SettingsLinkCard
            href="/system/settings/directory"
            title="Directory"
            description="Review partner listing submissions and see how their inquiries are going."
          />
          <SettingsLinkCard
            href="/system/settings/integrations"
            title="Integrations"
            description="Connect email and the shared WhatsApp Business number."
          />
        </>
      )}

      <SettingsLinkCard
        href="/system/settings/changelog"
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

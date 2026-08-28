import { updateCurrency } from "@/app/actions/settings";
import { getCurrency } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { CURRENCIES } from "@/lib/currency";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { MyPhoneForm } from "@/components/settings/my-phone-form";
import { SettingsLinkCard } from "@/components/settings/settings-link-card";

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();
  const canManage = currentUser.role === "ADMIN";
  const [currency, phone] = await Promise.all([
    getCurrency(),
    db.user.findUnique({ where: { id: currentUser.id }, select: { phone: true } }).then((u) => u?.phone ?? null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="CRM-wide preferences" />

      {canManage && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Currency</CardTitle>
            </CardHeader>
            <CardBody>
              <form action={updateCurrency} className="space-y-4">
                <div>
                  <Label htmlFor="currency">
                    Used for every deal value across the CRM (dashboard, pipeline, AI summaries)
                  </Label>
                  <Select id="currency" name="currency" defaultValue={currency}>
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button type="submit">Save</Button>
              </form>
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
          <CardTitle>WhatsApp task reminders</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Set your number to get a daily WhatsApp summary of your due and overdue tasks each morning.
            Requires the team&apos;s WhatsApp Business connection to be set up (Settings → Integrations).
          </p>
          <MyPhoneForm currentPhone={phone} />
        </CardBody>
      </Card>

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

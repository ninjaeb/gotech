import { Trash2 } from "lucide-react";
import { updateCurrency } from "@/app/actions/settings";
import { deleteUser } from "@/app/actions/users";
import { deleteServicePackage } from "@/app/actions/service-packages";
import { getCurrency } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { CURRENCIES } from "@/lib/currency";
import { formatDate, formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { CreateUserForm } from "@/components/settings/create-user-form";
import { ResetPasswordButton } from "@/components/settings/reset-password-button";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { ServicePackageForm } from "@/components/settings/service-package-form";
import { BookingSettingsForm } from "@/components/settings/booking-settings-form";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { getSiteOrigin } from "@/lib/site-url";
import { getBookingSettings } from "@/lib/settings";

export default async function SettingsPage() {
  const [currency, currentUser, users, servicePackages, siteOrigin, bookingSettings] = await Promise.all([
    getCurrency(),
    getCurrentUser(),
    db.user.findMany({ orderBy: { createdAt: "asc" } }),
    db.servicePackage.findMany({ orderBy: { name: "asc" } }),
    getSiteOrigin(),
    getBookingSettings(),
  ]);
  const leadFormUrl = `${siteOrigin}/lead`;
  const leadFormEmbed = `<iframe src="${leadFormUrl}" style="width:100%;max-width:28rem;height:44rem;border:0" title="Contact us"></iframe>`;
  const bookingUrl = `${siteOrigin}/book`;

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="Settings" description="CRM-wide preferences" />

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

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
            {users.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800 dark:text-slate-200">
                    {user.name}
                    {user.id === currentUser.id && (
                      <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {user.email}
                    {user.title && ` · ${user.title}`} · joined {formatDate(user.createdAt)}
                  </p>
                </div>
                {user.id !== currentUser.id && (
                  <div className="flex items-center gap-2">
                    <ResetPasswordButton userId={user.id} userName={user.name} />
                    {users.length > 1 && (
                      <form action={deleteUser.bind(null, user.id)}>
                        <ConfirmSubmitButton
                          confirmMessage={`Remove ${user.name}'s login? They won't be able to sign in anymore.`}
                          size="sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <CreateUserForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services &amp; packages</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Reusable catalog for building quotes — add each thing you sell once, then pull it into any quote&apos;s line items.
          </p>
          {servicePackages.length > 0 && (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {servicePackages.map((pkg) => (
                <li key={pkg.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800 dark:text-slate-200">{pkg.name}</p>
                    <p className="truncate text-xs text-slate-400">
                      {formatCurrency(pkg.unitPrice.toString(), currency)}
                      {pkg.unit && ` / ${pkg.unit}`}
                      {pkg.description && ` · ${pkg.description}`}
                    </p>
                  </div>
                  <form action={deleteServicePackage.bind(null, pkg.id)}>
                    <ConfirmSubmitButton confirmMessage={`Remove "${pkg.name}" from the catalog?`} size="sm">
                      <Trash2 className="h-3.5 w-3.5" />
                    </ConfirmSubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <ServicePackageForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lead capture form</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            A public form for GoTech&apos;s marketing site. Each submission creates a Contact (and Company,
            if named) plus a new Deal in Lead stage — no manual re-entry.
          </p>
          <div>
            <Label htmlFor="lead-form-link">Direct link</Label>
            <div className="flex items-center gap-2">
              <Input id="lead-form-link" readOnly value={leadFormUrl} className="font-mono text-xs" />
              <CopyLinkButton text={leadFormUrl} />
            </div>
          </div>
          <div>
            <Label htmlFor="lead-form-embed">Embed on your site</Label>
            <div className="flex items-center gap-2">
              <Input id="lead-form-embed" readOnly value={leadFormEmbed} className="font-mono text-xs" />
              <CopyLinkButton text={leadFormEmbed} label="Copy embed code" />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meeting scheduler</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            A public booking link for discovery calls. A booking auto-creates a Contact and a follow-up
            Task at the chosen time — no back-and-forth over email.
          </p>
          <div>
            <Label htmlFor="booking-link">Direct link</Label>
            <div className="flex items-center gap-2">
              <Input id="booking-link" readOnly value={bookingUrl} className="font-mono text-xs" />
              <CopyLinkButton text={bookingUrl} />
            </div>
          </div>
          <BookingSettingsForm
            initialUtcOffsetMinutes={bookingSettings.utcOffsetMinutes}
            initialSlotMinutes={bookingSettings.slotMinutes}
            initialWeeklyHours={bookingSettings.weeklyHours}
          />
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

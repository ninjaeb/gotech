import { getCurrency } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { isGoogleAuthConfigured } from "@/lib/auth/google";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { CurrencyForm } from "@/components/settings/currency-form";
import { SettingsLinkCard } from "@/components/settings/settings-link-card";
import { InstallAppCard } from "@/components/settings/install-app-card";
import { GoogleCalendarAccountForm } from "@/components/settings/google-calendar-account-form";

// Shown after the /api/auth/google-calendar/callback redirect lands back
// here — a query param rather than a toast, since that round trip is a
// full page navigation with no client state to carry a toast across.
const CALENDAR_ERROR_MESSAGES: Record<string, string> = {
  google_unavailable: "Google isn't configured on this server.",
  google_no_refresh_token:
    "Google didn't grant offline access this time — try connecting again.",
  google_failed: "Couldn't connect Google Calendar — try again.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string; calendar_error?: string }>;
}) {
  const currentUser = await getCurrentUser();
  const canManage = currentUser.role === "ADMIN";
  const [currency, googleCalendarAccount, { calendar, calendar_error: calendarError }] = await Promise.all([
    getCurrency(),
    db.googleCalendarAccount.findUnique({
      where: { userId: currentUser.id },
      select: { email: true, lastSyncError: true },
    }),
    searchParams,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="CRM-wide preferences" />

      {calendar === "connected" && (
        <p className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Google Calendar connected.
        </p>
      )}
      {calendarError && (
        <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          {CALENDAR_ERROR_MESSAGES[calendarError] ?? "Couldn't connect Google Calendar — try again."}
        </p>
      )}

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
            href="/system/settings/billing"
            title="Billing"
            description="Business details and logo for quotes & invoices, tax, document numbering, and defaults."
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

      {isGoogleAuthConfigured() && (
        <Card>
          <CardHeader>
            <CardTitle>Google Calendar</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Personal, not shared — connects your own Google account. Every Task you&apos;re assigned with a due
              date shows up as an all-day event on your calendar, kept in sync as it&apos;s edited, reassigned, or
              completed.
            </p>
            <GoogleCalendarAccountForm account={googleCalendarAccount} />
          </CardBody>
        </Card>
      )}

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

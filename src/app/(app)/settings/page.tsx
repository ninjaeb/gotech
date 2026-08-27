import Link from "next/link";
import { ChevronRight, Trash2 } from "lucide-react";
import { updateCurrency } from "@/app/actions/settings";
import { deleteUser } from "@/app/actions/users";
import { getCurrency } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { CURRENCIES } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { CreateUserForm } from "@/components/settings/create-user-form";
import { UserRateEditor } from "@/components/settings/user-rate-editor";
import { UserRoleSelect } from "@/components/settings/user-role-select";
import { ResetPasswordButton } from "@/components/settings/reset-password-button";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { BookingSettingsForm } from "@/components/settings/booking-settings-form";
import { EmailAccountForm } from "@/components/settings/email-account-form";
import { WhatsAppAccountForm } from "@/components/settings/whatsapp-account-form";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { getSiteOrigin } from "@/lib/site-url";
import { getBookingSettings } from "@/lib/settings";

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();
  const canManage = currentUser.role === "ADMIN";
  const [currency, users, siteOrigin, bookingSettings, emailAccount, whatsAppAccount] = await Promise.all([
    getCurrency(),
    db.user.findMany({ orderBy: { createdAt: "asc" } }),
    getSiteOrigin(),
    getBookingSettings(),
    db.emailAccount.findUnique({
      where: { userId: currentUser.id },
      select: { email: true, lastSyncedAt: true, lastSyncError: true },
    }),
    db.whatsAppAccount.findUnique({
      where: { id: "singleton" },
      select: { phoneNumberId: true, displayPhoneNumber: true, webhookVerifyToken: true, lastSyncError: true },
    }),
  ]);
  const leadFormUrl = `${siteOrigin}/lead`;
  const leadFormEmbed = `<iframe src="${leadFormUrl}" style="width:100%;max-width:28rem;height:44rem;border:0" title="Contact us"></iframe>`;
  const bookingUrl = `${siteOrigin}/book`;
  const whatsAppWebhookUrl = `${siteOrigin}/api/whatsapp/webhook`;

  return (
    <div className="max-w-lg space-y-6">
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

      <Card>
        <CardBody>
          <Link
            href="/settings/pipelines"
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">Pipelines</p>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                Give each deal type its own stage list — a new-build project, a retainer, a referral don&apos;t
                have to share one kanban.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Link
            href="/settings/sequences"
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">Sequences</p>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                Multi-step automated email cadences — enroll a contact from their page and it sends itself,
                stopping the moment they reply.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>
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
                <div className="flex items-center gap-3">
                  <UserRateEditor
                    userId={user.id}
                    hourlyRate={user.hourlyRate === null ? null : Number(user.hourlyRate)}
                    currency={currency}
                  />
                  {user.id !== currentUser.id && (
                    <div className="flex items-center gap-2">
                      <UserRoleSelect userId={user.id} role={user.role} />
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
                </div>
              </li>
            ))}
          </ul>

          <CreateUserForm />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Link
            href="/settings/products"
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">Products &amp; Services</p>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                Reusable catalog for building quotes — add each thing you sell once, then pull it into any
                quote&apos;s line items.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Link
            href="/settings/quote-templates"
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">Quote templates</p>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                Save a full set of line items once, then start any new quote from it instead of building one
                from scratch.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>
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
          <CardTitle>Connect your email</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Personal, not shared — this is your own inbox. New mail to/from an address that matches a
            Contact gets logged automatically, and you can send from here too. Runs on a schedule (see the
            README&apos;s cron job setup) plus whenever you hit Sync now.
          </p>
          <EmailAccountForm account={emailAccount} />
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
      </>
      )}

      <Card>
        <CardBody>
          <Link
            href="/settings/changelog"
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">Changelog</p>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                See what&apos;s new — every feature and change, with version and date.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>
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

import { requireAdmin } from "@/lib/auth/dal";
import { getBookingSettings } from "@/lib/settings";
import { getSiteOrigin } from "@/lib/site-url";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/field";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { BookingSettingsForm } from "@/components/settings/booking-settings-form";

export default async function FormsSettingsPage() {
  await requireAdmin();
  const [siteOrigin, bookingSettings] = await Promise.all([getSiteOrigin(), getBookingSettings()]);
  const leadFormUrl = `${siteOrigin}/lead`;
  const leadFormEmbed = `<iframe src="${leadFormUrl}" style="width:100%;max-width:28rem;height:44rem;border:0" title="Contact us"></iframe>`;
  const leadWidgetEmbed = `<div data-gotech-lead-form></div>\n<script src="${siteOrigin}/embed/lead-form.js" async></script>`;
  const bookingUrl = `${siteOrigin}/book`;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Forms & Booking" }]}
        title="Forms & Booking"
        description="Public-facing forms that feed straight into the CRM"
      />
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
            <Label htmlFor="lead-form-embed">Embed on your site (iframe)</Label>
            <div className="flex items-center gap-2">
              <Input id="lead-form-embed" readOnly value={leadFormEmbed} className="font-mono text-xs" />
              <CopyLinkButton text={leadFormEmbed} label="Copy embed code" />
            </div>
          </div>
          <div>
            <Label htmlFor="lead-widget-embed">Embed that adapts to your site&apos;s own style</Label>
            <p className="mb-1.5 text-xs text-slate-400">
              Renders directly into your page (not an iframe), so it automatically picks up your site&apos;s
              fonts, colors, and any input/button styling you already have — instead of looking like a
              GoTech-branded box dropped on the page.
            </p>
            <div className="flex items-start gap-2">
              <Textarea
                id="lead-widget-embed"
                readOnly
                value={leadWidgetEmbed}
                rows={3}
                className="font-mono text-xs"
              />
              <CopyLinkButton text={leadWidgetEmbed} label="Copy embed code" />
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
    </div>
  );
}

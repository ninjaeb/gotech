import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { getReferralSettings } from "@/lib/settings";
import { getSiteOrigin } from "@/lib/site-url";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferralSettingsForm } from "@/components/referrals/referral-settings-form";

export default async function ReferralSettingsPage() {
  await requireAdmin();
  const [settings, siteOrigin] = await Promise.all([getReferralSettings(), getSiteOrigin()]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Referrals" }]}
        title="Referrals"
        description="Commission rate and landing page for the partner referral program"
      />
      <Card>
        <CardHeader>
          <CardTitle>Program defaults</CardTitle>
        </CardHeader>
        <CardBody>
          <ReferralSettingsForm commissionRate={settings.commissionRate} landingUrl={settings.landingUrl} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardBody>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
            <li>
              Add a partner from{" "}
              <Link href="/settings/team" className="text-indigo-600 hover:underline dark:text-indigo-400">
                Settings → Team
              </Link>{" "}
              with the <strong>Partner</strong> role. They get their own login to the partner portal only — nothing
              in the CRM.
            </li>
            <li>
              Their referral link looks like{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-neutral-800">
                {siteOrigin}/r/&lt;their-code&gt;
              </code>
              . Every click is counted, then sent on to the landing page above with{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-neutral-800">?ref=&lt;code&gt;</code>{" "}
              appended.
            </li>
            <li>
              The lead-capture widget on that page (the JS embed from Settings → Forms & Booking) reads the code and
              sends it with the inquiry, so the new Deal is marked <em>Referred by</em> that partner with source{" "}
              <em>Referral</em>. An iframe or direct link needs <code className="font-mono text-xs">?ref=</code> passed
              through by the host page itself — the JS widget handles it automatically.
            </li>
            <li>
              When the deal is won, a commission (deal value × rate) is created for approval on the{" "}
              <Link href="/referrals" className="text-indigo-600 hover:underline dark:text-indigo-400">
                Referrals
              </Link>{" "}
              page. Once approved, the partner can request a withdrawal; you pay it out by hand and mark it paid there.
            </li>
          </ol>
        </CardBody>
      </Card>
    </div>
  );
}

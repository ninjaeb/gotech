import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/dal";
import { getBillingSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BusinessDetailsForm,
  DocumentDefaultsForm,
  NumberingForm,
  TaxSettingsForm,
} from "@/components/settings/billing/billing-forms";

export default async function BillingSettingsPage() {
  await requireAdmin();
  const [settings, logo, sequences] = await Promise.all([
    getBillingSettings(),
    db.businessLogo.findUnique({ where: { id: "singleton" }, select: { updatedAt: true } }),
    db.documentSequence.findMany({ select: { key: true, nextNumber: true } }),
  ]);
  const next = (key: string) => sequences.find((s) => s.key === key)?.nextNumber ?? 1;
  const logoUrl = logo ? `/api/settings/logo?v=${logo.updatedAt.getTime()}` : null;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Settings", href: "/system/settings" }, { label: "Billing" }]}
        title="Billing"
        description="What gets printed on quotes and invoices, how they're numbered, and their defaults"
      />

      <Card>
        <CardHeader>
          <CardTitle>Business details</CardTitle>
        </CardHeader>
        <CardBody>
          <BusinessDetailsForm settings={settings} logoUrl={logoUrl} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax</CardTitle>
        </CardHeader>
        <CardBody>
          <TaxSettingsForm settings={settings} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Numbering</CardTitle>
        </CardHeader>
        <CardBody>
          <NumberingForm settings={settings} nextQuoteNumber={next("QUOTE")} nextInvoiceNumber={next("INVOICE")} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document defaults</CardTitle>
        </CardHeader>
        <CardBody>
          <DocumentDefaultsForm settings={settings} />
        </CardBody>
      </Card>
    </div>
  );
}

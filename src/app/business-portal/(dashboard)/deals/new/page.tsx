import { createPartnerDeal } from "@/app/actions/partner-deals";
import { PartnerDealForm } from "@/components/business-crm/partner-deal-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { requireCompletePartnerProfile } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getCurrency } from "@/lib/settings";

export default async function NewPartnerDealPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; contactId?: string }>;
}) {
  const user = await requireCompletePartnerProfile();
  const { companyId, contactId } = await searchParams;
  const [currency, companies, contacts] = await Promise.all([
    getCurrency(),
    db.partnerCompany.findMany({ where: { partnerId: user.id }, orderBy: { name: "asc" } }),
    db.partnerContact.findMany({
      where: { partnerId: user.id },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, companyId: true },
    }),
  ]);

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: "Deals", href: "/business-portal/deals" }, { label: "New deal" }]} title="New deal" />
      <Card>
        <CardBody>
          <PartnerDealForm
            action={createPartnerDeal}
            companies={companies}
            contacts={contacts}
            defaultCompanyId={companyId}
            defaultContactId={contactId}
            currency={currency}
            submitLabel="Create deal"
          />
        </CardBody>
      </Card>
    </div>
  );
}

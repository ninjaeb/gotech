import { NewPartnerContactForm } from "@/components/business-crm/new-partner-contact-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { requireCompletePartnerProfile } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export default async function NewPartnerContactPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const user = await requireCompletePartnerProfile();
  const { companyId } = await searchParams;
  const companies = await db.partnerCompany.findMany({
    where: { partnerId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Contacts", href: "/business-portal/contacts" }, { label: "New contact" }]}
        title="New contact"
      />
      <Card>
        <CardBody>
          <NewPartnerContactForm companies={companies} defaultCompanyId={companyId} />
        </CardBody>
      </Card>
    </div>
  );
}

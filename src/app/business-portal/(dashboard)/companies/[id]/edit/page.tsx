import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updatePartnerCompany } from "@/app/actions/partner-companies";
import { PartnerCompanyForm } from "@/components/business-crm/partner-company-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { requireCompletePartnerProfile } from "@/lib/auth/dal";

export default async function EditPartnerCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCompletePartnerProfile();
  const { id } = await params;
  const company = await db.partnerCompany.findFirst({ where: { id, partnerId: user.id } });
  if (!company) notFound();

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Companies", href: "/business-portal/companies" },
          { label: company.name, href: `/business-portal/companies/${company.id}` },
          { label: "Edit" },
        ]}
        title={`Edit ${company.name}`}
      />
      <Card>
        <CardBody>
          <PartnerCompanyForm action={updatePartnerCompany.bind(null, company.id)} company={company} />
        </CardBody>
      </Card>
    </div>
  );
}

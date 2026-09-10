import { createPartnerCompany } from "@/app/actions/partner-companies";
import { PartnerCompanyForm } from "@/components/business-crm/partner-company-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { requireCompletePartnerProfile } from "@/lib/auth/dal";

export default async function NewPartnerCompanyPage() {
  await requireCompletePartnerProfile();
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Companies", href: "/business-portal/companies" }, { label: "New company" }]}
        title="New company"
      />
      <Card>
        <CardBody>
          <PartnerCompanyForm action={createPartnerCompany} submitLabel="Create company" />
        </CardBody>
      </Card>
    </div>
  );
}

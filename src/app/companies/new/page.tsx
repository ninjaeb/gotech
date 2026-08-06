import { createCompany } from "@/app/actions/companies";
import { CompanyForm } from "@/components/companies/company-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";

export default function NewCompanyPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="New company" />
      <Card>
        <CardBody>
          <CompanyForm action={createCompany} submitLabel="Create company" />
        </CardBody>
      </Card>
    </div>
  );
}

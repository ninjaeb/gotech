import { createCompany } from "@/app/actions/companies";
import { CompanyForm } from "@/components/companies/company-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { requireSales } from "@/lib/auth/dal";

export default async function NewCompanyPage() {
  await requireSales();
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Companies", href: "/companies" }, { label: "New company" }]}
        title="New company"
      />
      <Card>
        <CardBody>
          <CompanyForm action={createCompany} submitLabel="Create company" />
        </CardBody>
      </Card>
    </div>
  );
}

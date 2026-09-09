import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateCompany } from "@/app/actions/companies";
import { CompanyForm } from "@/components/companies/company-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { requireSales } from "@/lib/auth/dal";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSales();
  const { id } = await params;
  const company = await db.company.findUnique({ where: { id } });
  if (!company) notFound();

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Companies", href: "/system/companies" },
          { label: company.name, href: `/system/companies/${company.id}` },
          { label: "Edit" },
        ]}
        title={`Edit ${company.name}`}
      />
      <Card>
        <CardBody>
          <CompanyForm
            action={updateCompany.bind(null, company.id)}
            company={company}
            submitLabel="Save changes"
          />
        </CardBody>
      </Card>
    </div>
  );
}

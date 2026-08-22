import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateCompany } from "@/app/actions/companies";
import { CompanyForm } from "@/components/companies/company-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/dal";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const company = await db.company.findUnique({ where: { id } });
  if (!company) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit ${company.name}`} />
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

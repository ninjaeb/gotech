import { db } from "@/lib/db";
import { NewContactForm } from "@/components/contacts/new-contact-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/dal";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  await requireAdmin();
  const { companyId } = await searchParams;
  const companies = await db.company.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-2xl">
      <PageHeader title="New contact" />
      <Card>
        <CardBody>
          <NewContactForm companies={companies} defaultCompanyId={companyId} />
        </CardBody>
      </Card>
    </div>
  );
}

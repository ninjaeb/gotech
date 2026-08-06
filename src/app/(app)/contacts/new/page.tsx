import { db } from "@/lib/db";
import { createContact } from "@/app/actions/contacts";
import { ContactForm } from "@/components/contacts/contact-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;
  const companies = await db.company.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-2xl">
      <PageHeader title="New contact" />
      <Card>
        <CardBody>
          <ContactForm
            action={createContact}
            companies={companies}
            defaultCompanyId={companyId}
            submitLabel="Create contact"
          />
        </CardBody>
      </Card>
    </div>
  );
}

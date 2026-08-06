import { db } from "@/lib/db";
import { createDeal } from "@/app/actions/deals";
import { DealForm } from "@/components/deals/deal-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; contactId?: string }>;
}) {
  const { companyId, contactId } = await searchParams;
  const [companies, contacts] = await Promise.all([
    db.company.findMany({ orderBy: { name: "asc" } }),
    db.contact.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader title="New deal" />
      <Card>
        <CardBody>
          <DealForm
            action={createDeal}
            companies={companies}
            contacts={contacts}
            defaultCompanyId={companyId}
            defaultContactId={contactId}
            submitLabel="Create deal"
          />
        </CardBody>
      </Card>
    </div>
  );
}

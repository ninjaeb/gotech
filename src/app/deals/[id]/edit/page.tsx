import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateDeal } from "@/app/actions/deals";
import { DealForm } from "@/components/deals/deal-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [deal, companies, contacts] = await Promise.all([
    db.deal.findUnique({ where: { id } }),
    db.company.findMany({ orderBy: { name: "asc" } }),
    db.contact.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);
  if (!deal) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit ${deal.title}`} />
      <Card>
        <CardBody>
          <DealForm
            action={updateDeal.bind(null, deal.id)}
            deal={deal}
            companies={companies}
            contacts={contacts}
            submitLabel="Save changes"
          />
        </CardBody>
      </Card>
    </div>
  );
}

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateDeal } from "@/app/actions/deals";
import { DealForm } from "@/components/deals/deal-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { getCurrency } from "@/lib/settings";
import { getPipelinesWithStages } from "@/lib/pipelines";
import { requireAdmin } from "@/lib/auth/dal";

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [currency, deal, companies, contacts, pipelines, users] = await Promise.all([
    getCurrency(),
    db.deal.findUnique({ where: { id } }),
    db.company.findMany({ orderBy: { name: "asc" } }),
    db.contact.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, companyId: true },
    }),
    getPipelinesWithStages(),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!deal) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit ${deal.title}`} />
      <Card>
        <CardBody>
          <DealForm
            action={updateDeal.bind(null, deal.id)}
            deal={{ ...deal, value: Number(deal.value) }}
            companies={companies}
            contacts={contacts}
            pipelines={pipelines}
            users={users}
            submitLabel="Save changes"
            currency={currency}
          />
        </CardBody>
      </Card>
    </div>
  );
}

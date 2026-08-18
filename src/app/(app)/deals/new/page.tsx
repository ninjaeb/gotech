import { db } from "@/lib/db";
import { createDeal } from "@/app/actions/deals";
import { DealForm } from "@/components/deals/deal-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { getCurrency } from "@/lib/settings";
import { getPipelinesWithStages, getDefaultPipeline } from "@/lib/pipelines";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; contactId?: string; pipelineId?: string }>;
}) {
  const { companyId, contactId, pipelineId } = await searchParams;
  const [currency, companies, contacts, pipelines, defaultPipeline] = await Promise.all([
    getCurrency(),
    db.company.findMany({ orderBy: { name: "asc" } }),
    db.contact.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, companyId: true },
    }),
    getPipelinesWithStages(),
    getDefaultPipeline(),
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
            pipelines={pipelines}
            defaultCompanyId={companyId}
            defaultContactId={contactId}
            defaultPipelineId={pipelineId ?? defaultPipeline.id}
            submitLabel="Create deal"
            currency={currency}
          />
        </CardBody>
      </Card>
    </div>
  );
}

import { db } from "@/lib/db";
import { createDeal } from "@/app/actions/deals";
import { DealForm } from "@/components/deals/deal-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { getCurrency } from "@/lib/settings";
import { getPipelinesWithStages, getDefaultPipeline } from "@/lib/pipelines";
import { requireAdmin } from "@/lib/auth/dal";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; contactId?: string; pipelineId?: string }>;
}) {
  const { companyId, contactId, pipelineId } = await searchParams;
  const currentUser = await requireAdmin();
  const [currency, companies, contacts, pipelines, defaultPipeline, users] = await Promise.all([
    getCurrency(),
    db.company.findMany({ orderBy: { name: "asc" } }),
    db.contact.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, companyId: true },
    }),
    getPipelinesWithStages(),
    getDefaultPipeline(),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
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
            users={users}
            defaultCompanyId={companyId}
            defaultContactId={contactId}
            defaultPipelineId={pipelineId ?? defaultPipeline.id}
            defaultOwnerId={currentUser.id}
            submitLabel="Create deal"
            currency={currency}
          />
        </CardBody>
      </Card>
    </div>
  );
}

import { createPartnerTask } from "@/app/actions/partner-tasks";
import { PartnerTaskForm } from "@/components/business-crm/partner-task-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { requireCompletePartnerProfile } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export default async function NewPartnerTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; contactId?: string; dealId?: string }>;
}) {
  const user = await requireCompletePartnerProfile();
  const { companyId, contactId, dealId } = await searchParams;
  const [companies, contacts, deals] = await Promise.all([
    db.partnerCompany.findMany({ where: { partnerId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.partnerContact.findMany({
      where: { partnerId: user.id },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, companyId: true },
    }),
    db.partnerDeal.findMany({
      where: { partnerId: user.id },
      orderBy: { title: "asc" },
      select: { id: true, title: true, companyId: true, contactId: true },
    }),
  ]);

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: "Tasks", href: "/business-portal/tasks" }, { label: "New task" }]} title="New task" />
      <Card>
        <CardBody>
          <PartnerTaskForm
            action={createPartnerTask}
            companies={companies}
            contacts={contacts}
            deals={deals}
            defaultCompanyId={companyId}
            defaultContactId={contactId}
            defaultDealId={dealId}
            submitLabel="Create task"
          />
        </CardBody>
      </Card>
    </div>
  );
}

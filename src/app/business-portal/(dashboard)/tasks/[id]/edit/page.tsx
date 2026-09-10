import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updatePartnerTask } from "@/app/actions/partner-tasks";
import { PartnerTaskForm } from "@/components/business-crm/partner-task-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { requireCompletePartnerProfile } from "@/lib/auth/dal";

export default async function EditPartnerTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCompletePartnerProfile();
  const { id } = await params;
  const [task, companies, contacts, deals] = await Promise.all([
    db.partnerTask.findFirst({ where: { id, partnerId: user.id } }),
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
  if (!task) notFound();

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Tasks", href: "/business-portal/tasks" },
          { label: task.title, href: `/business-portal/tasks/${task.id}` },
          { label: "Edit" },
        ]}
        title={`Edit ${task.title}`}
      />
      <Card>
        <CardBody>
          <PartnerTaskForm action={updatePartnerTask.bind(null, task.id)} task={task} companies={companies} contacts={contacts} deals={deals} />
        </CardBody>
      </Card>
    </div>
  );
}

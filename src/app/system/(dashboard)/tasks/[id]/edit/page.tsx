import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateTask } from "@/app/actions/tasks";
import { TaskForm } from "@/components/tasks/task-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/dal";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const [task, companies, contacts, deals, users] = await Promise.all([
    db.task.findUnique({
      where: { id },
      include: {
        assignees: { select: { userId: true } },
        followers: { select: { userId: true } },
        attachments: { select: { id: true, fileName: true, mimeType: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    db.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.contact.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, companyId: true },
    }),
    db.deal.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, companyId: true, contactId: true },
    }),
    // Assignees/followers (and the @mention list inside the description
    // field, which also reads this list — see AttachmentField) are staff
    // only: a Partner has no CRM inbox or task list of their own to see
    // either one land in, same reasoning as team-member-row.tsx's own
    // notification toggles.
    db.user.findMany({ where: { role: { not: "PARTNER" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!task) notFound();

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Tasks", href: "/system/tasks" },
          { label: task.title, href: `/system/tasks/${task.id}` },
          { label: "Edit" },
        ]}
        title="Edit task"
      />
      <Card>
        <CardBody>
          <TaskForm
            action={updateTask.bind(null, task.id)}
            task={task}
            companies={companies}
            contacts={contacts}
            deals={deals}
            users={users}
            assigneeIds={task.assignees.map((a) => a.userId)}
            followerIds={task.followers.map((f) => f.userId)}
            existingAttachments={task.attachments}
            submitLabel="Save changes"
          />
        </CardBody>
      </Card>
    </div>
  );
}

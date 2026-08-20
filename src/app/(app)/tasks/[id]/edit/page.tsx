import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateTask } from "@/app/actions/tasks";
import { TaskForm } from "@/components/tasks/task-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [task, companies, contacts, deals, users] = await Promise.all([
    db.task.findUnique({
      where: { id },
      include: { assignees: { select: { userId: true } }, followers: { select: { userId: true } } },
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
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!task) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader title="Edit task" />
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
            submitLabel="Save changes"
          />
        </CardBody>
      </Card>
    </div>
  );
}

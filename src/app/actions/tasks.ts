"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ActivityType, TaskType } from "@/generated/prisma/client";

const taskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required"),
  description: z.string().trim().nullish(),
  type: z.nativeEnum(TaskType).default(TaskType.OTHER),
  dueDate: z.string().trim().nullish(),
  contactId: z.string().trim().nullish(),
  companyId: z.string().trim().nullish(),
  dealId: z.string().trim().nullish(),
});

function revalidateTaskPaths(task: {
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
}) {
  revalidatePath("/tasks");
  revalidatePath("/");
  if (task.contactId) revalidatePath(`/contacts/${task.contactId}`);
  if (task.companyId) revalidatePath(`/companies/${task.companyId}`);
  if (task.dealId) revalidatePath(`/deals/${task.dealId}`);
}

export async function createTask(formData: FormData) {
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type") || TaskType.OTHER,
    dueDate: formData.get("dueDate"),
    contactId: formData.get("contactId"),
    companyId: formData.get("companyId"),
    dealId: formData.get("dealId"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid task data");
  }
  const data = parsed.data;
  const task = await db.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      type: data.type,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      contactId: data.contactId || null,
      companyId: data.companyId || null,
      dealId: data.dealId || null,
    },
  });
  revalidateTaskPaths(task);
}

export async function toggleTaskComplete(id: string) {
  const task = await db.task.findUniqueOrThrow({ where: { id } });
  const completed = !task.completed;

  await db.task.update({
    where: { id },
    data: { completed, completedAt: completed ? new Date() : null },
  });

  if (completed) {
    await db.activity.create({
      data: {
        type: ActivityType.TASK_COMPLETED,
        content: `Completed task "${task.title}"`,
        contactId: task.contactId,
        companyId: task.companyId,
        dealId: task.dealId,
      },
    });
  }

  revalidateTaskPaths(task);
}

export async function deleteTask(id: string, formData: FormData) {
  void formData;
  const task = await db.task.delete({ where: { id } });
  revalidateTaskPaths(task);
}

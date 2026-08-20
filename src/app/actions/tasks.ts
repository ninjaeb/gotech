"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ActivityType, TaskPriority, TaskType } from "@/generated/prisma/client";

const taskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required"),
  description: z.string().trim().nullish(),
  type: z.nativeEnum(TaskType).default(TaskType.OTHER),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dueDate: z.string().trim().nullish(),
  contactId: z.string().trim().nullish(),
  companyId: z.string().trim().nullish(),
  dealId: z.string().trim().nullish(),
  projectId: z.string().trim().nullish(),
});

function parseAssigneeIds(formData: FormData): string[] {
  return [...new Set(formData.getAll("assigneeIds").map(String).filter(Boolean))];
}

function parseFollowerIds(formData: FormData): string[] {
  return [...new Set(formData.getAll("followerIds").map(String).filter(Boolean))];
}

function revalidateTaskPaths(task: {
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  projectId?: string | null;
}) {
  revalidatePath("/tasks");
  revalidatePath("/");
  if (task.contactId) revalidatePath(`/contacts/${task.contactId}`);
  if (task.companyId) revalidatePath(`/companies/${task.companyId}`);
  if (task.dealId) revalidatePath(`/deals/${task.dealId}`);
  if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
}

export async function createTask(formData: FormData) {
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type") || TaskType.OTHER,
    priority: formData.get("priority") || TaskPriority.MEDIUM,
    dueDate: formData.get("dueDate"),
    contactId: formData.get("contactId"),
    companyId: formData.get("companyId"),
    dealId: formData.get("dealId"),
    projectId: formData.get("projectId"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid task data");
  }
  const data = parsed.data;
  const assigneeIds = parseAssigneeIds(formData);
  const followerIds = parseFollowerIds(formData);
  const task = await db.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      type: data.type,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      contactId: data.contactId || null,
      companyId: data.companyId || null,
      dealId: data.dealId || null,
      projectId: data.projectId || null,
      assignees: { create: assigneeIds.map((userId) => ({ userId })) },
      followers: { create: followerIds.map((userId) => ({ userId })) },
    },
  });
  revalidateTaskPaths(task);
}

// No projectId here deliberately — the generic task-edit form (TaskForm)
// has no field for it, so parsing "projectId" from its FormData would
// always be empty and silently unlink a milestone task from its project on
// every edit. Project association is only ever set at creation (either
// here via createTask, or by ensureProjectForWonDeal's seeding).
export async function updateTask(id: string, formData: FormData) {
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type") || TaskType.OTHER,
    priority: formData.get("priority") || TaskPriority.MEDIUM,
    dueDate: formData.get("dueDate"),
    contactId: formData.get("contactId"),
    companyId: formData.get("companyId"),
    dealId: formData.get("dealId"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid task data");
  }
  const data = parsed.data;
  const assigneeIds = parseAssigneeIds(formData);
  const followerIds = parseFollowerIds(formData);
  const previous = await db.task.findUniqueOrThrow({
    where: { id },
    select: { contactId: true, companyId: true, dealId: true, projectId: true },
  });
  const task = await db.task.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description || null,
      type: data.type,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      contactId: data.contactId || null,
      companyId: data.companyId || null,
      dealId: data.dealId || null,
      assignees: { deleteMany: {}, create: assigneeIds.map((userId) => ({ userId })) },
      followers: { deleteMany: {}, create: followerIds.map((userId) => ({ userId })) },
    },
  });
  revalidateTaskPaths(previous);
  revalidateTaskPaths(task);
  redirect("/tasks");
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
        projectId: task.projectId,
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

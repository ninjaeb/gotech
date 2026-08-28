"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ActivityType, TaskPriority, TaskType } from "@/generated/prisma/client";
import { getCurrentUser, requireAdminAction } from "@/lib/auth/dal";
import { findMentionedUserIds } from "@/lib/mentions";
import { notifyMentionsViaWhatsApp } from "@/lib/whatsapp";
import { getSiteOrigin } from "@/lib/site-url";

// Notifies everyone newly @mentioned in a task's description. `previousDescription`
// is null on create; on update it's the description before this edit, so
// re-saving an unchanged description never re-notifies — only a mention
// that's actually new to this save fires.
async function notifyTaskMentions(
  taskId: string,
  taskTitle: string,
  description: string | null,
  previousDescription: string | null,
) {
  if (!description) return;
  const [currentUser, users] = await Promise.all([
    getCurrentUser(),
    db.user.findMany({ select: { id: true, name: true } }),
  ]);
  const mentionedIds = findMentionedUserIds(description, users);
  const previousIds = previousDescription ? findMentionedUserIds(previousDescription, users) : [];
  const newlyMentioned = mentionedIds.filter((id) => !previousIds.includes(id));
  if (newlyMentioned.length === 0) return;

  const content = `${currentUser.name} mentioned you in a task: ${taskTitle}`;
  await db.notification.createMany({
    data: newlyMentioned.map((userId) => ({ userId, taskId, content })),
  });

  const origin = await getSiteOrigin();
  await notifyMentionsViaWhatsApp(newlyMentioned, currentUser.name, description, `${origin}/tasks/${taskId}`);
}

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
  id?: string;
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
  if (task.id) revalidatePath(`/tasks/${task.id}`);
}

export async function createTask(formData: FormData) {
  await requireAdminAction();
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
  await notifyTaskMentions(task.id, task.title, task.description, null);
  revalidateTaskPaths(task);
}

// No projectId here deliberately — the generic task-edit form (TaskForm)
// has no field for it, so parsing "projectId" from its FormData would
// always be empty and silently unlink a milestone task from its project on
// every edit. Project association is only ever set at creation (either
// here via createTask, or by ensureProjectForWonDeal's seeding).
export async function updateTask(id: string, formData: FormData) {
  await requireAdminAction();
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
    select: { contactId: true, companyId: true, dealId: true, projectId: true, description: true },
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
  await notifyTaskMentions(task.id, task.title, task.description, previous.description);
  revalidateTaskPaths(previous);
  revalidateTaskPaths(task);
  redirect("/tasks");
}

export async function toggleTaskComplete(id: string) {
  await requireAdminAction();
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
        taskId: task.id,
      },
    });
  }

  revalidateTaskPaths(task);
}

export async function deleteTask(id: string, formData: FormData) {
  void formData;
  await requireAdminAction();
  const task = await db.task.delete({ where: { id } });
  revalidateTaskPaths(task);
}

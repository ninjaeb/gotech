"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ActivityType, TaskPriority, TaskType } from "@/generated/prisma/client";
import { getCurrentUser, requireStaffAction } from "@/lib/auth/dal";
import { findMentionedUserIds } from "@/lib/mentions";
import { parseAttachmentFiles } from "@/lib/attachment";
import { notifyMentionsViaWhatsApp, notifyTaskStatusViaWhatsApp } from "@/lib/whatsapp";
import {
  scheduleOrSendTaskAssignmentNotification,
  cancelPendingTaskAssignmentNotifications,
} from "@/lib/task-assignment-notification";
import { syncTaskCalendarEvents, deleteTaskCalendarEvents } from "@/lib/task-calendar-sync";

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
    db.user.findMany({ where: { role: { not: "PARTNER" } }, select: { id: true, name: true } }),
  ]);
  const mentionedIds = findMentionedUserIds(description, users);
  const previousIds = previousDescription ? findMentionedUserIds(previousDescription, users) : [];
  const newlyMentioned = mentionedIds.filter((id) => !previousIds.includes(id));
  if (newlyMentioned.length === 0) return;

  const content = `${currentUser.name} mentioned you in a task: ${taskTitle}`;
  await db.notification.createMany({
    data: newlyMentioned.map((userId) => ({ userId, taskId, content })),
  });

  await notifyMentionsViaWhatsApp(newlyMentioned, currentUser, description, `/system/tasks/${taskId}`, {
    taskId,
    contactId: null,
    companyId: null,
    dealId: null,
    projectId: null,
  });
}

// Notifies whichever assignees are newly on the task this save — on create
// that's everyone assigned, on update only the ones not already there
// before (re-saving an unchanged assignee list never re-notifies). Skips
// the current user, since assigning yourself a task needs no notification.
async function notifyTaskAssignment(taskId: string, taskTitle: string, newAssigneeIds: string[]) {
  const currentUser = await getCurrentUser();
  const recipientIds = newAssigneeIds.filter((id) => id !== currentUser.id);
  await scheduleOrSendTaskAssignmentNotification(taskId, taskTitle, recipientIds, currentUser.id, currentUser.name);
}

// Notifies every follower except whoever just made the change, when a
// task's completion status flips — the whole point of following a task
// you're not assigned to. Same fire-and-forget pattern as the other two
// notification helpers above.
async function notifyTaskStatusChange(
  taskId: string,
  taskTitle: string,
  completed: boolean,
  followerIds: string[],
  actorId: string,
  actorName: string,
) {
  const recipientIds = followerIds.filter((id) => id !== actorId);
  if (recipientIds.length === 0) return;

  const statusText = completed ? "completed" : "reopened";
  const content = `${actorName} ${statusText} a task you're following: ${taskTitle}`;
  await db.notification.createMany({
    data: recipientIds.map((userId) => ({ userId, taskId, content })),
  });

  await notifyTaskStatusViaWhatsApp(recipientIds, actorName, taskTitle, statusText, `/system/tasks/${taskId}`);
}

const taskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required"),
  description: z.string().trim().nullish(),
  type: z.nativeEnum(TaskType).default(TaskType.OTHER),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dueDate: z.string().trim().nullish(),
  contactId: z.string().trim().nullish(),
  companyId: z.string().trim().nullish(),
  projectId: z.string().trim().nullish(),
});

function parseAssigneeIds(formData: FormData): string[] {
  return [...new Set(formData.getAll("assigneeIds").map(String).filter(Boolean))];
}

function parseFollowerIds(formData: FormData): string[] {
  return [...new Set(formData.getAll("followerIds").map(String).filter(Boolean))];
}

// A task can belong to any number of deals now (see the TaskDeal join
// table) — posted the same way as assigneeIds/followerIds, one form value
// per selected deal, whether that's several checkboxes (a candidate-deal
// picker) or a single hidden input (a page whose own deal is already fixed).
function parseDealIds(formData: FormData): string[] {
  return [...new Set(formData.getAll("dealIds").map(String).filter(Boolean))];
}

function revalidateTaskPaths(task: {
  id?: string;
  contactId?: string | null;
  companyId?: string | null;
  dealIds?: string[];
  projectId?: string | null;
}) {
  revalidatePath("/system/tasks");
  revalidatePath("/system");
  if (task.contactId) revalidatePath(`/system/contacts/${task.contactId}`);
  if (task.companyId) revalidatePath(`/system/companies/${task.companyId}`);
  for (const dealId of task.dealIds ?? []) revalidatePath(`/system/deals/${dealId}`);
  if (task.projectId) revalidatePath(`/system/projects/${task.projectId}`);
  if (task.id) revalidatePath(`/system/tasks/${task.id}`);
}

export async function createTask(formData: FormData) {
  await requireStaffAction();
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type") || TaskType.OTHER,
    priority: formData.get("priority") || TaskPriority.MEDIUM,
    dueDate: formData.get("dueDate"),
    contactId: formData.get("contactId"),
    companyId: formData.get("companyId"),
    projectId: formData.get("projectId"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid task data");
  }
  const data = parsed.data;
  const currentUser = await getCurrentUser();
  const assigneeIds = parseAssigneeIds(formData);
  const dealIds = parseDealIds(formData);
  // Assigning a task to someone auto-follows it for whoever did the
  // assigning — the same "I want visibility without being on the hook"
  // relationship following already models, just opted into automatically
  // rather than requiring a second manual step right after assigning.
  const followerIds = new Set(parseFollowerIds(formData));
  if (assigneeIds.length > 0) followerIds.add(currentUser.id);
  const task = await db.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      type: data.type,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      contactId: data.contactId || null,
      companyId: data.companyId || null,
      projectId: data.projectId || null,
      deals: { create: dealIds.map((dealId) => ({ dealId })) },
      assignees: { create: assigneeIds.map((userId) => ({ userId })) },
      followers: { create: [...followerIds].map((userId) => ({ userId })) },
    },
  });
  await notifyTaskMentions(task.id, task.title, task.description, null);
  await notifyTaskAssignment(task.id, task.title, assigneeIds);
  await syncTaskCalendarEvents(task.id);
  revalidateTaskPaths({ ...task, dealIds });
}

// No projectId here deliberately — the generic task-edit form (TaskForm)
// has no field for it, so parsing "projectId" from its FormData would
// always be empty and silently unlink a milestone task from its project on
// every edit. Project association is only ever set at creation (either
// here via createTask, or by ensureProjectForWonDeal's seeding).
export async function updateTask(id: string, formData: FormData) {
  await requireStaffAction();
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type") || TaskType.OTHER,
    priority: formData.get("priority") || TaskPriority.MEDIUM,
    dueDate: formData.get("dueDate"),
    contactId: formData.get("contactId"),
    companyId: formData.get("companyId"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid task data");
  }
  const data = parsed.data;
  const attachments = await parseAttachmentFiles(formData);
  const currentUser = await getCurrentUser();
  const assigneeIds = parseAssigneeIds(formData);
  const dealIds = parseDealIds(formData);
  const previous = await db.task.findUniqueOrThrow({
    where: { id },
    select: {
      contactId: true,
      companyId: true,
      projectId: true,
      description: true,
      assignees: { select: { userId: true } },
      deals: { select: { dealId: true } },
    },
  });
  const previousAssigneeIds = new Set(previous.assignees.map((a) => a.userId));
  const newlyAssignedIds = assigneeIds.filter((userId) => !previousAssigneeIds.has(userId));
  const unassignedIds = [...previousAssigneeIds].filter((userId) => !assigneeIds.includes(userId));
  // Same auto-follow as createTask — only when this save actually adds a
  // new assignee, so an unrelated edit never silently re-adds someone who'd
  // deliberately unfollowed.
  const followerIds = new Set(parseFollowerIds(formData));
  if (newlyAssignedIds.length > 0) followerIds.add(currentUser.id);
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
      deals: { deleteMany: {}, create: dealIds.map((dealId) => ({ dealId })) },
      assignees: { deleteMany: {}, create: assigneeIds.map((userId) => ({ userId })) },
      followers: { deleteMany: {}, create: [...followerIds].map((userId) => ({ userId })) },
      // Additive, not a replace — an edit that doesn't touch the description
      // shouldn't drop attachments a previous save already added.
      attachments: { create: attachments },
    },
  });
  await notifyTaskMentions(task.id, task.title, task.description, previous.description);
  await notifyTaskAssignment(task.id, task.title, newlyAssignedIds);
  await cancelPendingTaskAssignmentNotifications(task.id, unassignedIds);
  await syncTaskCalendarEvents(task.id);
  revalidateTaskPaths({ ...previous, dealIds: previous.deals.map((d) => d.dealId) });
  revalidateTaskPaths({ ...task, dealIds });
  redirect("/system/tasks");
}

export async function toggleTaskComplete(id: string) {
  const currentUser = await requireStaffAction();
  const task = await db.task.findUniqueOrThrow({
    where: { id },
    include: { followers: { select: { userId: true } }, deals: { select: { dealId: true } } },
  });
  const completed = !task.completed;
  const dealIds = task.deals.map((d) => d.dealId);

  await db.task.update({
    where: { id },
    data: { completed, completedAt: completed ? new Date() : null },
  });

  if (completed) {
    // Activity.dealId is still a single column, so a task linked to more
    // than one deal gets one Activity row per deal — each deal's own
    // timeline should show this completion, not just whichever came first.
    // A task with no linked deal still logs its one row, with dealId null.
    for (const dealId of dealIds.length > 0 ? dealIds : [null]) {
      await db.activity.create({
        data: {
          type: ActivityType.TASK_COMPLETED,
          content: `Completed task "${task.title}"`,
          contactId: task.contactId,
          companyId: task.companyId,
          dealId,
          projectId: task.projectId,
          taskId: task.id,
        },
      });
    }
  }

  await notifyTaskStatusChange(
    task.id,
    task.title,
    completed,
    task.followers.map((f) => f.userId),
    currentUser.id,
    currentUser.name,
  );
  await syncTaskCalendarEvents(task.id);

  revalidateTaskPaths({ ...task, dealIds });
}

export async function deleteTask(id: string, formData: FormData) {
  void formData;
  await requireStaffAction();
  const task = await db.task.findUniqueOrThrow({
    where: { id },
    select: { id: true, contactId: true, companyId: true, projectId: true, deals: { select: { dealId: true } } },
  });
  // Before the row itself goes — once it's deleted, the cascading foreign
  // key drops every TaskCalendarEvent for it, taking the record of which
  // Google events to delete along with it.
  await deleteTaskCalendarEvents(id);
  await db.task.delete({ where: { id } });
  revalidateTaskPaths({ ...task, dealIds: task.deals.map((d) => d.dealId) });
}

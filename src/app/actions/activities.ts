"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ActivityType } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/dal";
import { findMentionedUserIds } from "@/lib/mentions";
import { fullName } from "@/lib/format";
import { notificationHref } from "@/lib/notification-href";
import { notifyMentionsViaWhatsApp } from "@/lib/whatsapp";
import { parseAttachmentFiles } from "@/lib/attachment";

const noteSchema = z.object({
  content: z.string().trim().min(1, "Note cannot be empty"),
  type: z.nativeEnum(ActivityType).default(ActivityType.NOTE),
  contactId: z.string().trim().nullish(),
  companyId: z.string().trim().nullish(),
  dealId: z.string().trim().nullish(),
  projectId: z.string().trim().nullish(),
  taskId: z.string().trim().nullish(),
});

// Whichever one of these is set names the page the mentioning note lives
// on, for the notification text ("mentioned you in a note on Acme Corp").
async function describeActivityParent(data: {
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
}): Promise<string | null> {
  if (data.contactId) {
    const contact = await db.contact.findUnique({
      where: { id: data.contactId },
      select: { firstName: true, lastName: true },
    });
    return contact ? fullName(contact.firstName, contact.lastName) : null;
  }
  if (data.companyId) {
    const company = await db.company.findUnique({ where: { id: data.companyId }, select: { name: true } });
    return company?.name ?? null;
  }
  if (data.dealId) {
    const deal = await db.deal.findUnique({ where: { id: data.dealId }, select: { title: true } });
    return deal?.title ?? null;
  }
  if (data.projectId) {
    const project = await db.project.findUnique({ where: { id: data.projectId }, select: { name: true } });
    return project?.name ?? null;
  }
  if (data.taskId) {
    const task = await db.task.findUnique({ where: { id: data.taskId }, select: { title: true } });
    return task?.title ?? null;
  }
  return null;
}

export type AddActivityState = { error: string } | { success: true } | undefined;

export async function addActivity(_prevState: AddActivityState, formData: FormData): Promise<AddActivityState> {
  const parsed = noteSchema.safeParse({
    content: formData.get("content"),
    type: formData.get("type") || ActivityType.NOTE,
    contactId: formData.get("contactId"),
    companyId: formData.get("companyId"),
    dealId: formData.get("dealId"),
    projectId: formData.get("projectId"),
    taskId: formData.get("taskId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid activity data" };
  }
  const data = parsed.data;

  let attachments: Awaited<ReturnType<typeof parseAttachmentFiles>>;
  try {
    attachments = await parseAttachmentFiles(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Attachment could not be read." };
  }

  const [currentUser, users] = await Promise.all([
    getCurrentUser(),
    db.user.findMany({ select: { id: true, name: true } }),
  ]);

  const activity = await db.activity.create({
    data: {
      type: data.type,
      content: data.content,
      contactId: data.contactId || null,
      companyId: data.companyId || null,
      dealId: data.dealId || null,
      projectId: data.projectId || null,
      taskId: data.taskId || null,
      attachments: { create: attachments },
    },
  });

  const mentionedUserIds = findMentionedUserIds(data.content, users);
  if (mentionedUserIds.length > 0) {
    const parentLabel = await describeActivityParent(data);
    const content = `${currentUser.name} mentioned you in a note${parentLabel ? ` on ${parentLabel}` : ""}`;
    await db.notification.createMany({
      data: mentionedUserIds.map((userId) => ({ userId, activityId: activity.id, content })),
    });

    // Reuses the exact same priority order the in-app notification bell
    // links to (see notificationHref) so the WhatsApp link can never point
    // somewhere different than clicking the bell would.
    const entityRefs = {
      taskId: data.taskId || null,
      contactId: data.contactId || null,
      companyId: data.companyId || null,
      dealId: data.dealId || null,
      projectId: data.projectId || null,
    };
    const path = notificationHref({ taskId: null, activity: entityRefs });
    if (path) {
      await notifyMentionsViaWhatsApp(mentionedUserIds, currentUser, data.content, path, entityRefs);
    }
  }

  if (data.contactId) revalidatePath(`/contacts/${data.contactId}`);
  if (data.companyId) revalidatePath(`/companies/${data.companyId}`);
  if (data.dealId) revalidatePath(`/deals/${data.dealId}`);
  if (data.projectId) revalidatePath(`/projects/${data.projectId}`);
  if (data.taskId) revalidatePath(`/tasks/${data.taskId}`);
  return { success: true };
}

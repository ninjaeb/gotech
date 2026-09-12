"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";

const timeEntrySchema = z.object({
  minutes: z.coerce.number().int().positive("Minutes must be greater than zero"),
  note: z.string().trim().nullish(),
  date: z.string().trim().nullish(),
});

function revalidateTimePaths(taskId: string, task: {
  contactId: string | null;
  companyId: string | null;
  dealIds: string[];
  projectId: string | null;
}) {
  revalidatePath(`/system/tasks/${taskId}/time`);
  revalidatePath("/system/tasks");
  if (task.contactId) revalidatePath(`/system/contacts/${task.contactId}`);
  if (task.companyId) revalidatePath(`/system/companies/${task.companyId}`);
  for (const dealId of task.dealIds) revalidatePath(`/system/deals/${dealId}`);
  if (task.projectId) revalidatePath(`/system/projects/${task.projectId}`);
}

export async function logTime(taskId: string, formData: FormData) {
  const parsed = timeEntrySchema.safeParse({
    minutes: formData.get("minutes"),
    note: formData.get("note"),
    date: formData.get("date"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid time entry");
  }
  const data = parsed.data;

  const [currentUser, task] = await Promise.all([
    getCurrentUser(),
    db.task.findUniqueOrThrow({
      where: { id: taskId },
      select: { contactId: true, companyId: true, projectId: true, deals: { select: { dealId: true } } },
    }),
  ]);

  await db.timeEntry.create({
    data: {
      taskId,
      userId: currentUser.id,
      minutes: data.minutes,
      note: data.note || null,
      date: data.date ? new Date(data.date) : new Date(),
    },
  });

  revalidateTimePaths(taskId, { ...task, dealIds: task.deals.map((d) => d.dealId) });
}

export async function deleteTimeEntry(taskId: string, id: string, formData: FormData) {
  void formData;
  const [currentUser, task, entry] = await Promise.all([
    getCurrentUser(),
    db.task.findUniqueOrThrow({
      where: { id: taskId },
      select: { contactId: true, companyId: true, projectId: true, deals: { select: { dealId: true } } },
    }),
    db.timeEntry.findUniqueOrThrow({ where: { id, taskId }, select: { userId: true } }),
  ]);
  if (entry.userId !== currentUser.id && currentUser.role !== "ADMIN") {
    throw new Error("You can only delete your own logged time.");
  }

  await db.timeEntry.delete({ where: { id, taskId } });

  revalidateTimePaths(taskId, { ...task, dealIds: task.deals.map((d) => d.dealId) });
}

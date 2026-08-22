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
  dealId: string | null;
  projectId: string | null;
}) {
  revalidatePath(`/tasks/${taskId}/time`);
  revalidatePath("/tasks");
  if (task.contactId) revalidatePath(`/contacts/${task.contactId}`);
  if (task.companyId) revalidatePath(`/companies/${task.companyId}`);
  if (task.dealId) revalidatePath(`/deals/${task.dealId}`);
  if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
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
      select: { contactId: true, companyId: true, dealId: true, projectId: true },
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

  revalidateTimePaths(taskId, task);
}

export async function deleteTimeEntry(taskId: string, id: string, formData: FormData) {
  void formData;
  const [currentUser, task, entry] = await Promise.all([
    getCurrentUser(),
    db.task.findUniqueOrThrow({
      where: { id: taskId },
      select: { contactId: true, companyId: true, dealId: true, projectId: true },
    }),
    db.timeEntry.findUniqueOrThrow({ where: { id, taskId }, select: { userId: true } }),
  ]);
  if (entry.userId !== currentUser.id && currentUser.role !== "ADMIN") {
    throw new Error("You can only delete your own logged time.");
  }

  await db.timeEntry.delete({ where: { id, taskId } });

  revalidateTimePaths(taskId, task);
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ActivityType } from "@/generated/prisma/client";

const noteSchema = z.object({
  content: z.string().trim().min(1, "Note cannot be empty"),
  type: z.nativeEnum(ActivityType).default(ActivityType.NOTE),
  contactId: z.string().trim().nullish(),
  companyId: z.string().trim().nullish(),
  dealId: z.string().trim().nullish(),
  projectId: z.string().trim().nullish(),
});

export async function addActivity(formData: FormData) {
  const parsed = noteSchema.safeParse({
    content: formData.get("content"),
    type: formData.get("type") || ActivityType.NOTE,
    contactId: formData.get("contactId"),
    companyId: formData.get("companyId"),
    dealId: formData.get("dealId"),
    projectId: formData.get("projectId"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid activity data");
  }
  const data = parsed.data;

  await db.activity.create({
    data: {
      type: data.type,
      content: data.content,
      contactId: data.contactId || null,
      companyId: data.companyId || null,
      dealId: data.dealId || null,
      projectId: data.projectId || null,
    },
  });

  if (data.contactId) revalidatePath(`/contacts/${data.contactId}`);
  if (data.companyId) revalidatePath(`/companies/${data.companyId}`);
  if (data.dealId) revalidatePath(`/deals/${data.dealId}`);
  if (data.projectId) revalidatePath(`/projects/${data.projectId}`);
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePartnerAction } from "@/lib/auth/dal";

const taskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required"),
  description: z.string().trim().optional(),
  dueDate: z.string().trim().optional(),
  companyId: z.string().trim().optional(),
  contactId: z.string().trim().optional(),
  dealId: z.string().trim().optional(),
});

export type PartnerTaskFormValues = {
  title: string;
  description: string;
  dueDate: string;
  companyId: string;
  contactId: string;
  dealId: string;
};

function stringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function extractTaskFormValues(formData: FormData): PartnerTaskFormValues {
  return {
    title: stringField(formData, "title"),
    description: stringField(formData, "description"),
    dueDate: stringField(formData, "dueDate"),
    companyId: stringField(formData, "companyId"),
    contactId: stringField(formData, "contactId"),
    dealId: stringField(formData, "dealId"),
  };
}

export type PartnerTaskFormState = { error: string; values: PartnerTaskFormValues } | undefined;

type ParsedTaskForm =
  | { success: false; error: string }
  | {
      success: true;
      data: {
        title: string;
        description: string | null;
        dueDate: Date | null;
        companyId: string | null;
        contactId: string | null;
        dealId: string | null;
      };
    };

// company/contact/dealId are reconciled against rows this partner actually
// owns rather than trusted as-is — same convention as parseContactForm in
// src/app/actions/partner-contacts.ts.
async function parseTaskForm(formData: FormData, partnerId: string): Promise<ParsedTaskForm> {
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    dueDate: formData.get("dueDate"),
    companyId: formData.get("companyId"),
    contactId: formData.get("contactId"),
    dealId: formData.get("dealId"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid task data" };
  }
  const data = parsed.data;
  const [company, contact, deal] = await Promise.all([
    data.companyId ? db.partnerCompany.findFirst({ where: { id: data.companyId, partnerId }, select: { id: true } }) : null,
    data.contactId ? db.partnerContact.findFirst({ where: { id: data.contactId, partnerId }, select: { id: true } }) : null,
    data.dealId ? db.partnerDeal.findFirst({ where: { id: data.dealId, partnerId }, select: { id: true } }) : null,
  ]);
  return {
    success: true,
    data: {
      title: data.title,
      description: data.description || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      companyId: company?.id ?? null,
      contactId: contact?.id ?? null,
      dealId: deal?.id ?? null,
    },
  };
}

// Every task is assigned to its creator at creation — a join table from day
// one (see PartnerTaskAssignee in schema.prisma) even though a
// business-portal account is a single login today, so a future teammate
// added under the same account can be reassigned without a breaking
// migration. There's no assignee picker yet since there's nobody else to
// assign to.
export async function createPartnerTask(
  _prevState: PartnerTaskFormState,
  formData: FormData,
): Promise<PartnerTaskFormState> {
  const partner = await requirePartnerAction();
  const parsed = await parseTaskForm(formData, partner.id);
  if (!parsed.success) return { error: parsed.error, values: extractTaskFormValues(formData) };
  const task = await db.partnerTask.create({
    data: { ...parsed.data, partnerId: partner.id, assignees: { create: { userId: partner.id } } },
  });
  revalidatePath("/business-portal/tasks");
  redirect(`/business-portal/tasks/${task.id}`);
}

export async function updatePartnerTask(
  id: string,
  _prevState: PartnerTaskFormState,
  formData: FormData,
): Promise<PartnerTaskFormState> {
  const partner = await requirePartnerAction();
  const existing = await db.partnerTask.findFirst({ where: { id, partnerId: partner.id } });
  if (!existing) return { error: "Task not found.", values: extractTaskFormValues(formData) };
  const parsed = await parseTaskForm(formData, partner.id);
  if (!parsed.success) return { error: parsed.error, values: extractTaskFormValues(formData) };
  await db.partnerTask.update({ where: { id }, data: parsed.data });
  revalidatePath("/business-portal/tasks");
  revalidatePath(`/business-portal/tasks/${id}`);
  redirect(`/business-portal/tasks/${id}`);
}

// The quick-toggle checkbox on the task list/detail page — flips whatever
// the current state is (same convention as toggleTaskComplete in
// src/app/actions/tasks.ts), so the form binding this needs no other field.
export async function togglePartnerTaskCompleted(id: string): Promise<void> {
  const partner = await requirePartnerAction();
  const existing = await db.partnerTask.findFirst({ where: { id, partnerId: partner.id } });
  if (!existing) throw new Error("Task not found.");
  const completed = !existing.completed;
  await db.partnerTask.update({ where: { id }, data: { completed, completedAt: completed ? new Date() : null } });
  revalidatePath("/business-portal/tasks");
  revalidatePath(`/business-portal/tasks/${id}`);
}

export async function deletePartnerTask(id: string, formData: FormData) {
  void formData;
  const partner = await requirePartnerAction();
  const existing = await db.partnerTask.findFirst({ where: { id, partnerId: partner.id } });
  if (!existing) throw new Error("Task not found.");
  await db.partnerTask.delete({ where: { id } });
  revalidatePath("/business-portal/tasks");
  redirect("/business-portal/tasks");
}

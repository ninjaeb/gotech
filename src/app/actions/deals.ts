"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { DealStage, ActivityType } from "@/generated/prisma/client";
import { DEAL_STAGE_LABELS } from "@/lib/labels";

const dealSchema = z.object({
  title: z.string().trim().min(1, "Deal title is required"),
  value: z.coerce.number().min(0, "Value must be zero or more").default(0),
  stage: z.nativeEnum(DealStage).default(DealStage.LEAD),
  expectedCloseDate: z.string().trim().optional(),
  companyId: z.string().trim().optional(),
  contactId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

function parseDealForm(formData: FormData) {
  const parsed = dealSchema.safeParse({
    title: formData.get("title"),
    value: formData.get("value") || 0,
    stage: formData.get("stage") || DealStage.LEAD,
    expectedCloseDate: formData.get("expectedCloseDate"),
    companyId: formData.get("companyId"),
    contactId: formData.get("contactId"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid deal data");
  }
  const data = parsed.data;
  return {
    title: data.title,
    value: data.value,
    stage: data.stage,
    expectedCloseDate: data.expectedCloseDate
      ? new Date(data.expectedCloseDate)
      : null,
    companyId: data.companyId || null,
    contactId: data.contactId || null,
    notes: data.notes || null,
  };
}

function revalidateDealPaths(dealId: string, companyId?: string | null, contactId?: string | null) {
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/");
  if (companyId) revalidatePath(`/companies/${companyId}`);
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

export async function createDeal(formData: FormData) {
  const data = parseDealForm(formData);
  const deal = await db.deal.create({ data });
  revalidateDealPaths(deal.id, data.companyId, data.contactId);
  redirect(`/deals/${deal.id}`);
}

export async function updateDeal(id: string, formData: FormData) {
  const data = parseDealForm(formData);
  const previous = await db.deal.findUniqueOrThrow({ where: { id } });

  await db.deal.update({ where: { id }, data });

  if (previous.stage !== data.stage) {
    await db.activity.create({
      data: {
        type: ActivityType.STAGE_CHANGE,
        content: `Stage changed from ${DEAL_STAGE_LABELS[previous.stage]} to ${DEAL_STAGE_LABELS[data.stage]}`,
        dealId: id,
      },
    });
  }

  revalidateDealPaths(id, previous.companyId, previous.contactId);
  revalidateDealPaths(id, data.companyId, data.contactId);
  redirect(`/deals/${id}`);
}

export async function changeDealStage(id: string, stage: DealStage) {
  const previous = await db.deal.findUniqueOrThrow({ where: { id } });
  if (previous.stage === stage) return;

  await db.deal.update({ where: { id }, data: { stage } });
  await db.activity.create({
    data: {
      type: ActivityType.STAGE_CHANGE,
      content: `Stage changed from ${DEAL_STAGE_LABELS[previous.stage]} to ${DEAL_STAGE_LABELS[stage]}`,
      dealId: id,
    },
  });

  revalidateDealPaths(id, previous.companyId, previous.contactId);
}

export async function deleteDeal(id: string, formData: FormData) {
  void formData;
  const deal = await db.deal.findUniqueOrThrow({ where: { id } });
  await db.deal.delete({ where: { id } });
  revalidateDealPaths(id, deal.companyId, deal.contactId);
  redirect("/deals");
}

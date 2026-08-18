"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ActivityType } from "@/generated/prisma/client";
import { stageGateError } from "@/lib/deal-hygiene";
import { ensureProjectForWonDeal } from "@/app/actions/projects";

const dealSchema = z.object({
  title: z.string().trim().min(1, "Deal title is required"),
  value: z.coerce.number().min(0, "Value must be zero or more").default(0),
  pipelineId: z.string().trim().min(1, "Pick a pipeline"),
  pipelineStageId: z.string().trim().min(1, "Pick a stage"),
  expectedCloseDate: z.string().trim().optional(),
  companyId: z.string().trim().optional(),
  contactId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

function parseDealForm(formData: FormData) {
  const parsed = dealSchema.safeParse({
    title: formData.get("title"),
    value: formData.get("value") || 0,
    pipelineId: formData.get("pipelineId"),
    pipelineStageId: formData.get("pipelineStageId"),
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
    pipelineId: data.pipelineId,
    pipelineStageId: data.pipelineStageId,
    expectedCloseDate: data.expectedCloseDate
      ? new Date(data.expectedCloseDate)
      : null,
    companyId: data.companyId || null,
    contactId: data.contactId || null,
    notes: data.notes || null,
  };
}

// The stage a deal form submits has to actually belong to the pipeline it
// also submits — a mismatched pair would otherwise silently leave the deal
// pointing at another pipeline's stage.
async function resolveTargetStage(pipelineId: string, pipelineStageId: string) {
  const stage = await db.pipelineStage.findUnique({ where: { id: pipelineStageId } });
  if (!stage || stage.pipelineId !== pipelineId) {
    throw new Error("That stage doesn't belong to the selected pipeline — try again.");
  }
  return stage;
}

function revalidateDealPaths(dealId: string, companyId?: string | null, contactId?: string | null) {
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/");
  if (companyId) revalidatePath(`/companies/${companyId}`);
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

export type DealFormState = { error: string } | undefined;

export async function createDeal(_prevState: DealFormState, formData: FormData): Promise<DealFormState> {
  let data;
  try {
    data = parseDealForm(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid deal data" };
  }

  let targetStage;
  try {
    targetStage = await resolveTargetStage(data.pipelineId, data.pipelineStageId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid stage" };
  }

  // A brand-new deal can't have a quote yet — attempting to create one
  // straight into a Won stage always fails the gate below, which is
  // correct: that workflow has to go through an earlier stage first.
  const gateError = stageGateError({ ...data, quoteCount: 0 }, targetStage);
  if (gateError) return { error: gateError };

  const deal = await db.deal.create({ data });
  revalidateDealPaths(deal.id, data.companyId, data.contactId);
  redirect(`/deals/${deal.id}`);
}

export async function updateDeal(
  id: string,
  _prevState: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  let data;
  try {
    data = parseDealForm(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid deal data" };
  }

  let targetStage;
  try {
    targetStage = await resolveTargetStage(data.pipelineId, data.pipelineStageId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid stage" };
  }

  const previous = await db.deal.findUniqueOrThrow({
    where: { id },
    include: { pipelineStage: true, _count: { select: { quotes: true } } },
  });

  const gateError = stageGateError({ ...data, quoteCount: previous._count.quotes }, targetStage);
  if (gateError) return { error: gateError };

  await db.deal.update({ where: { id }, data });

  if (previous.pipelineStageId !== data.pipelineStageId) {
    await db.activity.create({
      data: {
        type: ActivityType.STAGE_CHANGE,
        content: `Stage changed from ${previous.pipelineStage.name} to ${targetStage.name}`,
        dealId: id,
      },
    });
  }
  if (targetStage.isWon) {
    await ensureProjectForWonDeal({ id, title: data.title });
  }

  revalidateDealPaths(id, previous.companyId, previous.contactId);
  revalidateDealPaths(id, data.companyId, data.contactId);
  redirect(`/deals/${id}`);
}

export async function changeDealStage(id: string, pipelineStageId: string): Promise<{ error: string } | undefined> {
  const previous = await db.deal.findUniqueOrThrow({
    where: { id },
    include: { pipelineStage: true, _count: { select: { quotes: true } } },
  });
  if (previous.pipelineStageId === pipelineStageId) return;

  const targetStage = await db.pipelineStage.findUnique({ where: { id: pipelineStageId } });
  if (!targetStage || targetStage.pipelineId !== previous.pipelineId) {
    return { error: "That stage doesn't belong to this deal's pipeline." };
  }

  const gateError = stageGateError(
    { value: Number(previous.value), companyId: previous.companyId, contactId: previous.contactId, quoteCount: previous._count.quotes },
    targetStage,
  );
  if (gateError) return { error: gateError };

  await db.deal.update({ where: { id }, data: { pipelineStageId } });
  await db.activity.create({
    data: {
      type: ActivityType.STAGE_CHANGE,
      content: `Stage changed from ${previous.pipelineStage.name} to ${targetStage.name}`,
      dealId: id,
    },
  });
  if (targetStage.isWon) {
    await ensureProjectForWonDeal({ id, title: previous.title });
  }

  revalidateDealPaths(id, previous.companyId, previous.contactId);
}

export async function deleteDeal(id: string, formData: FormData) {
  void formData;
  const deal = await db.deal.findUniqueOrThrow({ where: { id } });
  await db.deal.delete({ where: { id } });
  revalidateDealPaths(id, deal.companyId, deal.contactId);
  redirect("/deals");
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma, TaskPriority, TaskType } from "@/generated/prisma/client";
import { requireAdminAction, requireSalesAction } from "@/lib/auth/dal";
import { withFlash } from "@/lib/utils";

export type PipelineFormState = { error: string } | undefined;
export type PipelineStagesState = { error: string } | { success: true } | undefined;
export type PipelineActionState = { error: string } | { success: true } | undefined;
export type PipelineTaskTemplateState = { error: string } | { success: true } | undefined;
export type ApplyTaskTemplateState = { error: string } | { success: true; count: number } | undefined;

const STARTER_STAGES = [
  { name: "New", isWon: false, isLost: false },
  { name: "In Progress", isWon: false, isLost: false },
  { name: "Won", isWon: true, isLost: false },
  { name: "Lost", isWon: false, isLost: true },
];

export async function createPipeline(
  _prevState: PipelineFormState,
  formData: FormData,
): Promise<PipelineFormState> {
  await requireAdminAction();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Pipeline name is required" };

  const count = await db.pipeline.count();
  const pipeline = await db.pipeline.create({
    data: {
      name,
      sortOrder: count,
      stages: {
        create: STARTER_STAGES.map((stage, index) => ({ ...stage, sortOrder: index })),
      },
    },
  });

  revalidatePath("/system/settings/pipelines");
  redirect(withFlash(`/system/settings/pipelines/${pipeline.id}`, "Pipeline created."));
}

export async function renamePipeline(
  id: string,
  _prevState: PipelineActionState,
  formData: FormData,
): Promise<PipelineActionState> {
  await requireAdminAction();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Pipeline name is required" };
  await db.pipeline.update({ where: { id }, data: { name } });
  revalidatePath("/system/settings/pipelines");
  revalidatePath(`/system/settings/pipelines/${id}`);
  return { success: true };
}

export async function setDefaultPipeline(id: string): Promise<PipelineActionState> {
  await requireAdminAction();
  await db.$transaction([
    db.pipeline.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
    db.pipeline.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/system/settings/pipelines");
  revalidatePath("/system/deals");
  revalidatePath("/system");
  return { success: true };
}

export async function deletePipeline(id: string, formData: FormData) {
  void formData;
  await requireAdminAction();
  const [pipeline, totalCount] = await Promise.all([
    db.pipeline.findUniqueOrThrow({ where: { id }, include: { _count: { select: { deals: true } } } }),
    db.pipeline.count(),
  ]);
  if (pipeline.isDefault) {
    throw new Error("Set another pipeline as default before deleting this one.");
  }
  if (totalCount <= 1) {
    throw new Error("Can't delete the only pipeline.");
  }
  if (pipeline._count.deals > 0) {
    throw new Error(`Move or delete this pipeline's ${pipeline._count.deals} deal(s) first.`);
  }

  await db.pipeline.delete({ where: { id } });
  revalidatePath("/system/settings/pipelines");
  redirect(withFlash("/system/settings/pipelines", "Pipeline deleted."));
}

const stageSchema = z.object({
  id: z.string().trim().nullable(),
  name: z.string().trim().min(1, "Every stage needs a name"),
  isWon: z.boolean(),
  isLost: z.boolean(),
});
const stagesSchema = z.array(stageSchema).min(1, "A pipeline needs at least one stage");

export async function updatePipelineStages(
  pipelineId: string,
  _prevState: PipelineStagesState,
  formData: FormData,
): Promise<PipelineStagesState> {
  await requireAdminAction();
  let rawStages: unknown;
  try {
    rawStages = JSON.parse(String(formData.get("stagesJson") || "[]"));
  } catch {
    return { error: "Stage data could not be read — try again." };
  }
  const parsed = stagesSchema.safeParse(rawStages);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid stage data" };
  }
  const stages = parsed.data;

  const existing = await db.pipelineStage.findMany({ where: { pipelineId }, select: { id: true } });
  const submittedIds = new Set(stages.map((s) => s.id).filter((id): id is string => Boolean(id)));
  const removedIds = existing.map((s) => s.id).filter((id) => !submittedIds.has(id));

  try {
    await db.$transaction(async (tx) => {
      if (removedIds.length > 0) {
        await tx.pipelineStage.deleteMany({ where: { id: { in: removedIds } } });
      }
      for (const [index, stage] of stages.entries()) {
        if (stage.id) {
          await tx.pipelineStage.update({
            where: { id: stage.id },
            data: { name: stage.name, isWon: stage.isWon, isLost: stage.isLost, sortOrder: index },
          });
        } else {
          await tx.pipelineStage.create({
            data: { pipelineId, name: stage.name, isWon: stage.isWon, isLost: stage.isLost, sortOrder: index },
          });
        }
      }
    });
  } catch (error) {
    // P2003 = foreign key violation — a deal still points at one of the
    // stages we tried to remove.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { error: "Move deals off a removed stage before deleting it." };
    }
    throw error;
  }

  revalidatePath(`/system/settings/pipelines/${pipelineId}`);
  revalidatePath("/system/settings/pipelines");
  revalidatePath("/system/deals");
  revalidatePath("/system");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Task checklist template — the standard set of tasks every deal of this
// pipeline's "type" should start with. applyPipelineTaskTemplate (below)
// turns these into real Tasks; daysFromNow is a standard duration counted
// from whenever the template is applied to a deal, not from the template
// item's own createdAt — same idiom as MILESTONE_TEMPLATE's daysFromNow in
// src/app/actions/projects.ts.

const taskTemplateItemSchema = z.object({
  id: z.string().trim().nullable(),
  title: z.string().trim().min(1, "Every task needs a title"),
  type: z.nativeEnum(TaskType),
  priority: z.nativeEnum(TaskPriority),
  daysFromNow: z.number().int().min(0).nullable(),
});
const taskTemplateItemsSchema = z.array(taskTemplateItemSchema);

export async function updatePipelineTaskTemplate(
  pipelineId: string,
  _prevState: PipelineTaskTemplateState,
  formData: FormData,
): Promise<PipelineTaskTemplateState> {
  await requireAdminAction();
  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(formData.get("itemsJson") || "[]"));
  } catch {
    return { error: "Task list data could not be read — try again." };
  }
  const parsed = taskTemplateItemsSchema.safeParse(rawItems);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid task list data" };
  }
  const items = parsed.data;

  const existing = await db.pipelineTaskTemplateItem.findMany({ where: { pipelineId }, select: { id: true } });
  const submittedIds = new Set(items.map((i) => i.id).filter((id): id is string => Boolean(id)));
  const removedIds = existing.map((i) => i.id).filter((id) => !submittedIds.has(id));

  await db.$transaction(async (tx) => {
    if (removedIds.length > 0) {
      await tx.pipelineTaskTemplateItem.deleteMany({ where: { id: { in: removedIds } } });
    }
    for (const [index, item] of items.entries()) {
      const data = { title: item.title, type: item.type, priority: item.priority, daysFromNow: item.daysFromNow, sortOrder: index };
      if (item.id) {
        await tx.pipelineTaskTemplateItem.update({ where: { id: item.id }, data });
      } else {
        await tx.pipelineTaskTemplateItem.create({ data: { ...data, pipelineId } });
      }
    }
  });

  revalidatePath(`/system/settings/pipelines/${pipelineId}`);
  return { success: true };
}

// Turns a pipeline's standard checklist into real Tasks on a deal, linked
// to the deal itself and its company/contact (so the task also shows up on
// their own pages, not just the deal's) — skips any title the deal's tasks
// already carry, so this is safe to call more than once (re-applied by
// hand after the template changes, or a deal already seeded at creation)
// without piling up duplicates. Returns how many tasks it actually added.
export async function applyPipelineTaskTemplate(deal: {
  id: string;
  pipelineId: string;
  companyId: string | null;
  contactId: string | null;
}): Promise<number> {
  const [items, existingTasks] = await Promise.all([
    db.pipelineTaskTemplateItem.findMany({ where: { pipelineId: deal.pipelineId }, orderBy: { sortOrder: "asc" } }),
    db.task.findMany({ where: { dealId: deal.id }, select: { title: true } }),
  ]);
  if (items.length === 0) return 0;
  const existingTitles = new Set(existingTasks.map((t) => t.title));
  const toCreate = items.filter((item) => !existingTitles.has(item.title));
  if (toCreate.length === 0) return 0;

  const now = Date.now();
  await db.task.createMany({
    data: toCreate.map((item) => ({
      title: item.title,
      type: item.type,
      priority: item.priority,
      dueDate: item.daysFromNow === null ? null : new Date(now + item.daysFromNow * 86_400_000),
      dealId: deal.id,
      companyId: deal.companyId,
      contactId: deal.contactId,
    })),
  });
  return toCreate.length;
}

export async function applyTaskTemplateToDeal(
  dealId: string,
  _prevState: ApplyTaskTemplateState,
  formData: FormData,
): Promise<ApplyTaskTemplateState> {
  void formData;
  await requireSalesAction();
  const deal = await db.deal.findUnique({
    where: { id: dealId },
    select: { id: true, pipelineId: true, companyId: true, contactId: true },
  });
  if (!deal) return { error: "Deal not found." };

  const count = await applyPipelineTaskTemplate(deal);
  revalidatePath(`/system/deals/${dealId}`);
  revalidatePath("/system/tasks");
  revalidatePath("/system");
  return { success: true, count };
}

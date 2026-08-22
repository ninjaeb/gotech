"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireAdminAction } from "@/lib/auth/dal";

export type PipelineFormState = { error: string } | undefined;

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

  revalidatePath("/settings/pipelines");
  redirect(`/settings/pipelines/${pipeline.id}`);
}

export async function renamePipeline(id: string, formData: FormData) {
  await requireAdminAction();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Pipeline name is required");
  await db.pipeline.update({ where: { id }, data: { name } });
  revalidatePath("/settings/pipelines");
  revalidatePath(`/settings/pipelines/${id}`);
}

export async function setDefaultPipeline(id: string) {
  await requireAdminAction();
  await db.$transaction([
    db.pipeline.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
    db.pipeline.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/settings/pipelines");
  revalidatePath("/deals");
  revalidatePath("/");
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
  revalidatePath("/settings/pipelines");
  redirect("/settings/pipelines");
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
  _prevState: PipelineFormState,
  formData: FormData,
): Promise<PipelineFormState> {
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

  revalidatePath(`/settings/pipelines/${pipelineId}`);
  revalidatePath("/settings/pipelines");
  revalidatePath("/deals");
  revalidatePath("/");
  return undefined;
}

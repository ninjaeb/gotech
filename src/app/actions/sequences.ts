"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { withFlash } from "@/lib/utils";

export type SequenceFormState = { error: string } | undefined;

const stepSchema = z.object({
  id: z.string().trim().nullable(),
  subject: z.string().trim().min(1, "Every step needs a subject"),
  body: z.string().trim().min(1, "Every step needs a message"),
  delayDays: z.coerce.number().int().min(0, "Delay must be zero or more days"),
});

const sequenceSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  active: z.boolean(),
  steps: z.array(stepSchema).min(1, "A sequence needs at least one step"),
});

function parseSequenceForm(formData: FormData) {
  let rawSteps: unknown;
  try {
    rawSteps = JSON.parse(String(formData.get("stepsJson") || "[]"));
  } catch {
    throw new Error("Step data could not be read — try again.");
  }
  const parsed = sequenceSchema.safeParse({
    name: formData.get("name"),
    active: formData.get("active") === "true",
    steps: rawSteps,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid sequence data");
  }
  return parsed.data;
}

export async function createSequence(
  _prevState: SequenceFormState,
  formData: FormData,
): Promise<SequenceFormState> {
  await requireAdminAction();
  let data;
  try {
    data = parseSequenceForm(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid sequence data" };
  }

  const sequence = await db.sequence.create({
    data: {
      name: data.name,
      active: data.active,
      steps: {
        create: data.steps.map((step, index) => ({
          subject: step.subject,
          body: step.body,
          delayDays: step.delayDays,
          sortOrder: index,
        })),
      },
    },
  });

  revalidatePath("/settings/sequences");
  redirect(withFlash(`/settings/sequences/${sequence.id}`, "Sequence created."));
}

// Steps are updated/created in place by id rather than deleted-and-recreated
// (unlike QuoteForm's simpler blob-replace) because SequenceEnrollment
// points at a specific SequenceStep — recreating every step on every save
// would knock every active enrollment's currentStepId to null.
export async function updateSequence(
  id: string,
  _prevState: SequenceFormState,
  formData: FormData,
): Promise<SequenceFormState> {
  await requireAdminAction();
  let data;
  try {
    data = parseSequenceForm(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid sequence data" };
  }

  const existing = await db.sequenceStep.findMany({ where: { sequenceId: id }, select: { id: true } });
  const submittedIds = new Set(data.steps.map((s) => s.id).filter((v): v is string => Boolean(v)));
  const removedIds = existing.map((s) => s.id).filter((stepId) => !submittedIds.has(stepId));

  await db.$transaction(async (tx) => {
    await tx.sequence.update({ where: { id }, data: { name: data.name, active: data.active } });
    if (removedIds.length > 0) {
      await tx.sequenceStep.deleteMany({ where: { id: { in: removedIds } } });
    }
    for (const [index, step] of data.steps.entries()) {
      if (step.id) {
        await tx.sequenceStep.update({
          where: { id: step.id },
          data: { subject: step.subject, body: step.body, delayDays: step.delayDays, sortOrder: index },
        });
      } else {
        await tx.sequenceStep.create({
          data: { sequenceId: id, subject: step.subject, body: step.body, delayDays: step.delayDays, sortOrder: index },
        });
      }
    }
  });

  revalidatePath(`/settings/sequences/${id}`);
  revalidatePath("/settings/sequences");
  redirect(withFlash(`/settings/sequences/${id}`, "Changes saved."));
}

export async function deleteSequence(id: string, formData: FormData) {
  void formData;
  await requireAdminAction();
  await db.sequence.delete({ where: { id } });
  revalidatePath("/settings/sequences");
  redirect(withFlash("/settings/sequences", "Sequence deleted."));
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import type { ProjectStatus } from "@/generated/prisma/client";

const MILESTONE_TEMPLATE: { title: string; daysFromNow: number }[] = [
  { title: "Kickoff call", daysFromNow: 3 },
  { title: "Discovery & planning complete", daysFromNow: 10 },
  { title: "Development complete", daysFromNow: 30 },
  { title: "QA & client review", daysFromNow: 37 },
  { title: "Launch / handoff", daysFromNow: 45 },
];

// Called from deals.ts when a deal's stage becomes WON. dealId is unique on
// Project, so this is safe to call more than once for the same deal (e.g.
// re-saving a deal that's already won) — it just returns the existing one.
export async function ensureProjectForWonDeal(deal: { id: string; title: string }) {
  const existing = await db.project.findUnique({ where: { dealId: deal.id } });
  if (existing) return existing;

  const now = new Date();
  const project = await db.project.create({
    data: {
      name: deal.title,
      dealId: deal.id,
      tasks: {
        create: MILESTONE_TEMPLATE.map(({ title, daysFromNow }) => {
          const dueDate = new Date(now);
          dueDate.setDate(dueDate.getDate() + daysFromNow);
          return { title, dueDate, type: "MILESTONE" as const };
        }),
      },
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/deals/${deal.id}`);
  return project;
}

export async function updateProjectStatus(id: string, status: ProjectStatus) {
  await db.project.update({ where: { id }, data: { status } });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
}

const optionalNonNegative = (message: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || (!Number.isNaN(Number(value)) && Number(value) >= 0), { message });

const projectBudgetSchema = z.object({
  budgetHours: optionalNonNegative("Budget hours must be a non-negative number"),
  budgetAmount: optionalNonNegative("Budget amount must be a non-negative number"),
  targetCompletionDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
});

export async function updateProjectBudget(id: string, formData: FormData) {
  const parsed = projectBudgetSchema.safeParse({
    budgetHours: formData.get("budgetHours"),
    budgetAmount: formData.get("budgetAmount"),
    targetCompletionDate: formData.get("targetCompletionDate"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid budget");
  }

  await db.project.update({
    where: { id },
    data: {
      budgetHours: parsed.data.budgetHours === null ? null : Math.round(Number(parsed.data.budgetHours)),
      budgetAmount: parsed.data.budgetAmount,
      targetCompletionDate: parsed.data.targetCompletionDate ? new Date(parsed.data.targetCompletionDate) : null,
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
}

export async function deleteProject(id: string, formData: FormData) {
  void formData;
  const project = await db.project.delete({ where: { id }, select: { dealId: true } });
  revalidatePath("/projects");
  revalidatePath(`/deals/${project.dealId}`);
  redirect("/projects");
}

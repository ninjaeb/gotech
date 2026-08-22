"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";

const servicePackageSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional(),
  unitPrice: z.coerce.number().min(0, "Price must be zero or more").default(0),
  unit: z.string().trim().optional(),
});

export type ServicePackageState = { error: string } | { success: true } | undefined;

export async function createServicePackage(
  _prevState: ServicePackageState,
  formData: FormData,
): Promise<ServicePackageState> {
  await requireAdminAction();
  const parsed = servicePackageSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    unitPrice: formData.get("unitPrice") || 0,
    unit: formData.get("unit"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.servicePackage.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      unitPrice: parsed.data.unitPrice,
      unit: parsed.data.unit || null,
    },
  });
  revalidatePath("/settings");
  return { success: true };
}

export async function deleteServicePackage(id: string) {
  await requireAdminAction();
  await db.servicePackage.delete({ where: { id } });
  revalidatePath("/settings");
}

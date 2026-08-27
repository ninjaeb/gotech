"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { PRODUCT_SERVICE_TYPES } from "@/lib/labels";
import type { ProductServiceType } from "@/generated/prisma/client";

const servicePackageSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(PRODUCT_SERVICE_TYPES as [ProductServiceType, ...ProductServiceType[]]).default("SERVICE"),
  description: z.string().trim().optional(),
  unitPrice: z.coerce.number().min(0, "Price must be zero or more").default(0),
  unit: z.string().trim().optional(),
});

export type ServicePackageState = { error: string } | { success: true } | undefined;

function parseServicePackageForm(formData: FormData) {
  const parsed = servicePackageSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type") || "SERVICE",
    description: formData.get("description"),
    unitPrice: formData.get("unitPrice") || 0,
    unit: formData.get("unit"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  return {
    name: parsed.data.name,
    type: parsed.data.type,
    description: parsed.data.description || null,
    unitPrice: parsed.data.unitPrice,
    unit: parsed.data.unit || null,
  };
}

export async function createServicePackage(
  _prevState: ServicePackageState,
  formData: FormData,
): Promise<ServicePackageState> {
  await requireAdminAction();
  let data: ReturnType<typeof parseServicePackageForm>;
  try {
    data = parseServicePackageForm(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Something went wrong." };
  }

  await db.servicePackage.create({ data });
  revalidatePath("/settings/products");
  return { success: true };
}

export async function updateServicePackage(
  id: string,
  _prevState: ServicePackageState,
  formData: FormData,
): Promise<ServicePackageState> {
  await requireAdminAction();
  let data: ReturnType<typeof parseServicePackageForm>;
  try {
    data = parseServicePackageForm(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Something went wrong." };
  }

  await db.servicePackage.update({ where: { id }, data });
  revalidatePath("/settings/products");
  revalidatePath(`/settings/products/${id}`);
  return { success: true };
}

export async function deleteServicePackage(id: string) {
  await requireAdminAction();
  await db.servicePackage.delete({ where: { id } });
  revalidatePath("/settings/products");
}

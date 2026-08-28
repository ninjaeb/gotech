"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { PRODUCT_SERVICE_TYPES, BILLING_FREQUENCIES } from "@/lib/labels";
import type { ProductServiceType, BillingFrequency } from "@/generated/prisma/client";

const componentSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().positive("Component quantity must be greater than zero"),
});

const servicePackageSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(PRODUCT_SERVICE_TYPES as [ProductServiceType, ...ProductServiceType[]]).default("SERVICE"),
  description: z.string().trim().optional(),
  unitPrice: z.coerce.number().min(0, "Price must be zero or more").default(0),
  // Empty means "not tracked" (null), not "$0 cost" — kept distinct from
  // unitPrice, which defaults to 0 when blank.
  unitCost: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), { message: "Cost must be zero or more" }),
  unit: z.string().trim().optional(),
  billingFrequency: z.enum(BILLING_FREQUENCIES as [BillingFrequency, ...BillingFrequency[]]).default("ONE_TIME"),
  components: z.array(componentSchema),
});

export type ServicePackageState = { error: string } | { success: true } | undefined;

// selfId is only known on update — a brand-new item can't yet be anyone's
// component, so the "already used elsewhere" check below only applies then.
async function parseServicePackageForm(formData: FormData, selfId?: string) {
  let rawComponents: unknown;
  try {
    rawComponents = JSON.parse(String(formData.get("componentsJson") || "[]"));
  } catch {
    throw new Error("Component data could not be read — try again.");
  }

  const parsed = servicePackageSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type") || "SERVICE",
    description: formData.get("description"),
    unitPrice: formData.get("unitPrice") || 0,
    unitCost: formData.get("unitCost"),
    unit: formData.get("unit"),
    billingFrequency: formData.get("billingFrequency") || "ONE_TIME",
    components: rawComponents,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const componentIds = parsed.data.components.map((c) => c.productId);
  if (selfId && componentIds.includes(selfId)) {
    throw new Error("A product/service can't be a component of itself.");
  }
  if (new Set(componentIds).size !== componentIds.length) {
    throw new Error("The same component was added twice.");
  }

  // Bundles are one level deep only, so this can never form a cycle:
  // neither a chosen component nor the item itself (if it's already used
  // as someone else's component) is allowed to also carry components.
  if (componentIds.length > 0) {
    const nestedBundles = await db.servicePackage.findMany({
      where: { id: { in: componentIds }, components: { some: {} } },
      select: { name: true },
    });
    if (nestedBundles.length > 0) {
      throw new Error(
        `"${nestedBundles[0].name}" already has its own components, so it can't be added as a component of another bundle.`,
      );
    }
    if (selfId) {
      const usedElsewhere = await db.servicePackageComponent.findFirst({ where: { productId: selfId } });
      if (usedElsewhere) {
        throw new Error("This item is already used as a component of another bundle, so it can't have its own components.");
      }
    }
  }

  return {
    name: parsed.data.name,
    type: parsed.data.type,
    description: parsed.data.description || null,
    unitPrice: parsed.data.unitPrice,
    unitCost: parsed.data.unitCost,
    unit: parsed.data.unit || null,
    billingFrequency: parsed.data.billingFrequency,
    components: parsed.data.components,
  };
}

export async function createServicePackage(
  _prevState: ServicePackageState,
  formData: FormData,
): Promise<ServicePackageState> {
  await requireAdminAction();
  let data: Awaited<ReturnType<typeof parseServicePackageForm>>;
  try {
    data = await parseServicePackageForm(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Something went wrong." };
  }

  const { components, ...rest } = data;
  await db.servicePackage.create({
    data: {
      ...rest,
      components: {
        create: components.map((c, index) => ({ productId: c.productId, quantity: c.quantity, sortOrder: index })),
      },
    },
  });
  revalidatePath("/settings/products");
  return { success: true };
}

export async function updateServicePackage(
  id: string,
  _prevState: ServicePackageState,
  formData: FormData,
): Promise<ServicePackageState> {
  await requireAdminAction();
  let data: Awaited<ReturnType<typeof parseServicePackageForm>>;
  try {
    data = await parseServicePackageForm(formData, id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Something went wrong." };
  }

  const { components, ...rest } = data;
  await db.servicePackage.update({
    where: { id },
    data: {
      ...rest,
      components: {
        deleteMany: {},
        create: components.map((c, index) => ({ productId: c.productId, quantity: c.quantity, sortOrder: index })),
      },
    },
  });
  revalidatePath("/settings/products");
  redirect("/settings/products");
}

export async function deleteServicePackage(id: string) {
  await requireAdminAction();
  await db.servicePackage.delete({ where: { id } });
  revalidatePath("/settings/products");
}

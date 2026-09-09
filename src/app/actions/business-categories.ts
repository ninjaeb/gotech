"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";

const nameSchema = z.object({
  name: z.string().trim().min(1, "Enter a category name.").max(60, "Keep it under 60 characters."),
});

// Admin-managed vocabulary a partner picks multiple of for their listing
// (see PartnerListingCategory in schema.prisma) — plain create/delete, no
// rename: renaming in place would silently reword every listing that
// already picked it, so retiring and re-adding is the deliberate path for
// a genuine rename.
export async function createBusinessCategory(formData: FormData): Promise<void> {
  await requireAdminAction();
  const parsed = nameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid category name.");
  }

  const existing = await db.businessCategory.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    throw new Error(`"${parsed.data.name}" already exists.`);
  }

  await db.businessCategory.create({ data: { name: parsed.data.name } });
  revalidatePath("/system/settings/directory");
  revalidatePath("/partner/listing");
}

// Deleting a category a listing still has selected just drops that
// selection (PartnerListingCategory cascades) — an already-published
// listing's category badges don't change until it's next re-approved, same
// as every other field in publishedSnapshot.
export async function deleteBusinessCategory(id: string): Promise<void> {
  await requireAdminAction();
  await db.businessCategory.delete({ where: { id } });
  revalidatePath("/system/settings/directory");
  revalidatePath("/partner/listing");
}

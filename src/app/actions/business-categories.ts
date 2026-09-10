"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";

// Fixed vocabulary a partner picks multiple of for their listing (see
// PartnerListingCategory in schema.prisma), seeded once via migration
// rather than admin-created — see prisma/migrations/20260909170000_seed_business_categories.
// Deleting a category a listing still has selected just drops that
// selection (PartnerListingCategory cascades) — an already-published
// listing's category badges don't change until it's next re-approved, same
// as every other field in publishedSnapshot.
export async function deleteBusinessCategory(id: string): Promise<void> {
  await requireAdminAction();
  await db.businessCategory.delete({ where: { id } });
  revalidatePath("/system/settings/directory");
  revalidatePath("/business-portal/listings");
  revalidatePath("/business-portal/listings/[id]", "layout");
}

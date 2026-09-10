"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePartnerAction } from "@/lib/auth/dal";
import { isValidEmailFormat } from "@/lib/email-format";
import { isValidPhoneFormat, normalizePhone, PHONE_FORMAT_HINT } from "@/lib/phone";

const partnerProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  companyName: z.string().trim().min(1, "Company name is required"),
  email: z.string().trim().toLowerCase().min(1, "Email is required").refine(isValidEmailFormat, {
    message: "Enter a valid email address",
  }),
  title: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || isValidPhoneFormat(value), { message: PHONE_FORMAT_HINT }),
  timezone: z.string().trim().optional(),
});

export type PartnerProfileState = { error: string } | { success: true } | undefined;

// Self-service, scoped to the caller's own row only — never takes a
// userId, unlike updateUserDetails (which is how an admin edits anyone
// from Settings → Team). The phone set here is the same WhatsApp-alert
// number used to notify the partner of a new directory lead (see
// notifyDirectoryLeadViaWhatsApp in src/lib/whatsapp.ts) — it's never part
// of PublishedListingSnapshot, so it never reaches the public directory.
export async function updatePartnerProfile(
  _prevState: PartnerProfileState,
  formData: FormData,
): Promise<PartnerProfileState> {
  const partner = await requirePartnerAction();

  const parsed = partnerProfileSchema.safeParse({
    name: formData.get("name"),
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    title: formData.get("title"),
    phone: formData.get("phone") || undefined,
    timezone: formData.get("timezone") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing && existing.id !== partner.id) {
    return { error: "A user with that email already exists." };
  }

  await db.user.update({
    where: { id: partner.id },
    data: {
      name: parsed.data.name,
      companyName: parsed.data.companyName,
      email: parsed.data.email,
      title: parsed.data.title || null,
      phone: parsed.data.phone ? normalizePhone(parsed.data.phone) : null,
      timezone: parsed.data.timezone || null,
    },
  });

  revalidatePath("/business-portal/profile");
  return { success: true };
}

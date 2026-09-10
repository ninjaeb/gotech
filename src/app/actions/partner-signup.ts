"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { createBusinessSession } from "@/lib/business/session";
import { registerPartnerWithPassword } from "@/lib/partner-signup";
import { isValidPhoneFormat } from "@/lib/phone";
import { isRateLimited, isSuspiciouslyFast } from "@/lib/lead-spam-guard";
import { firstHopValue } from "@/lib/site-url";
import type { PartnerSignupErrorCode } from "@/lib/directory-i18n";

const signupSchema = z.object({
  companyName: z.string().trim().min(1, "company_required"),
  contactName: z.string().trim().min(1, "name_required"),
  email: z.string().trim().toLowerCase().min(1, "email_required").email("email_invalid"),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || isValidPhoneFormat(value), { message: "phone_invalid" }),
  password: z.string().min(8, "password_length"),
});

export type PartnerSignupState = { status: "error"; code: PartnerSignupErrorCode } | undefined;

// Public, unauthenticated form (same honeypot + timing + IP-throttle
// pattern as the /lead form's submitLead — see lead-spam-guard.ts) that
// creates a login account (role PARTNER) AND a CRM Company/Contact in one
// step. See src/lib/partner-signup.ts for the shared logic this and the
// Google callback both call.
export async function signUpPartner(
  _prevState: PartnerSignupState,
  formData: FormData,
): Promise<PartnerSignupState> {
  if (String(formData.get("website") || "").trim()) {
    redirect("/business-portal");
  }
  if (isSuspiciouslyFast(formData.get("renderedAt"))) {
    redirect("/business-portal");
  }

  const headersList = await headers();
  if (isRateLimited(firstHopValue(headersList.get("x-forwarded-for")))) {
    return { status: "error", code: "rate_limited" };
  }

  const parsed = signupSchema.safeParse({
    companyName: formData.get("companyName"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message as PartnerSignupErrorCode) ?? "invalid_submission";
    return { status: "error", code };
  }

  const result = await registerPartnerWithPassword({
    companyName: parsed.data.companyName,
    contactName: parsed.data.contactName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    passwordHash: await hashPassword(parsed.data.password),
  });
  if (!result.ok) {
    return { status: "error", code: result.error };
  }

  await createBusinessSession(result.userId);
  redirect("/business-portal");
}

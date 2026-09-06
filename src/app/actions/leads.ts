"use server";

import { createLeadFromSubmission, leadSchema, type LeadFormErrorCode } from "@/lib/leads";

export type LeadFormState = { status: "error"; code: LeadFormErrorCode } | { status: "success" } | undefined;

// Public, unauthenticated — submitted from the hosted /lead page, not a
// logged-in user. `website` is a honeypot: real visitors never see or fill
// it, so anything in it means a bot filled every field it could find. We
// still return "success" for those so the bot doesn't learn to retry.
export async function submitLead(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  if (String(formData.get("website") || "").trim()) {
    return { status: "success" };
  }

  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    companyName: formData.get("companyName"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message as LeadFormErrorCode) ?? "invalid_submission";
    return { status: "error", code };
  }

  const result = await createLeadFromSubmission(parsed.data);
  if (!result.ok) {
    return { status: "error", code: result.code };
  }
  return { status: "success" };
}

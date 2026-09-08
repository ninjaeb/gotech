"use server";

import { headers } from "next/headers";
import {
  subscribeToNewsletter,
  newsletterSubscribeSchema,
  type NewsletterSubscribeErrorCode,
} from "@/lib/newsletter-subscribe";
import { isRateLimited, isSuspiciouslyFast } from "@/lib/lead-spam-guard";
import { firstHopValue } from "@/lib/site-url";

export type NewsletterSubscribeFormState =
  | { status: "error"; code: NewsletterSubscribeErrorCode }
  | { status: "success" }
  | undefined;

// Public, unauthenticated — submitted from the hosted /subscribe page, not
// a logged-in user. Same honeypot/fast-fill/rate-limit layering as
// submitLead (see leads.ts and lead-spam-guard.ts) — reused as-is, since
// none of it is lead-specific.
export async function submitNewsletterSubscribe(
  _prevState: NewsletterSubscribeFormState,
  formData: FormData,
): Promise<NewsletterSubscribeFormState> {
  if (String(formData.get("website") || "").trim()) {
    return { status: "success" };
  }
  if (isSuspiciouslyFast(formData.get("renderedAt"))) {
    return { status: "success" };
  }

  const headersList = await headers();
  if (isRateLimited(firstHopValue(headersList.get("x-forwarded-for")))) {
    return { status: "error", code: "rate_limited" };
  }

  const parsed = newsletterSubscribeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message as NewsletterSubscribeErrorCode) ?? "invalid_submission";
    return { status: "error", code };
  }

  const result = await subscribeToNewsletter(parsed.data);
  if (!result.ok) {
    return { status: "error", code: result.code };
  }
  return { status: "success" };
}

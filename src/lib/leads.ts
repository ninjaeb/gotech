import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { findOrCreateContactByEmail } from "@/lib/contact-matching";
import { getDefaultPipeline } from "@/lib/pipelines";
import { isValidPhoneFormat, normalizePhone } from "@/lib/phone";
import { notifyNewLeadViaWhatsApp } from "@/lib/whatsapp";

// Zod's "message" here is a semantic CODE, not display text — this schema
// is shared by both the hosted /lead page (English/Chinese/Malay via
// LeadCaptureForm) and the embeddable widget (its own copy of the same
// three languages), so neither the server nor this schema hardcodes any
// one language. Each caller maps a code to its own localized string.
export type LeadFormErrorCode =
  | "name_required"
  | "email_required"
  | "email_invalid"
  | "phone_required"
  | "phone_invalid"
  | "pipeline_not_ready"
  | "rate_limited"
  | "invalid_submission"
  | "generic";

export const leadSchema = z.object({
  name: z.string().trim().min(1, "name_required"),
  email: z.string().trim().min(1, "email_required").email("email_invalid"),
  phone: z
    .string()
    .trim()
    .min(1, "phone_required")
    .refine(isValidPhoneFormat, { message: "phone_invalid" }),
  companyName: z.string().trim().optional(),
  message: z.string().trim().optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type CreateLeadResult = { ok: true } | { ok: false; code: LeadFormErrorCode };

// Shared by every entry point that turns a lead-form submission into a
// Contact + Deal — the hosted /lead page's Server Action (same-origin form
// post) and the embeddable widget's public API route (cross-origin JSON
// post) both call this, so a submission looks identical in the CRM no
// matter which one it came through.
export async function createLeadFromSubmission(data: LeadInput): Promise<CreateLeadResult> {
  let companyId: string | null = null;
  const companyName = data.companyName?.trim();
  if (companyName) {
    const company = await db.company.findFirst({ where: { name: companyName }, select: { id: true } });
    companyId = company?.id ?? (await db.company.create({ data: { name: companyName }, select: { id: true } })).id;
  }

  const [contact, defaultPipeline] = await Promise.all([
    findOrCreateContactByEmail({
      name: data.name,
      email: data.email,
      phone: normalizePhone(data.phone),
      companyId,
      lifecycleStage: "LEAD",
    }),
    getDefaultPipeline(),
  ]);
  const firstStage = defaultPipeline.stages[0];
  if (!firstStage) {
    return { ok: false, code: "pipeline_not_ready" };
  }

  const deal = await db.deal.create({
    data: {
      title: `${companyName || data.name} — Website inquiry`,
      pipelineId: defaultPipeline.id,
      pipelineStageId: firstStage.id,
      companyId: contact.companyId ?? companyId,
      contactId: contact.id,
      source: "WEBSITE",
    },
  });

  // Unconditional (not just when data.message is set) — this is also what a
  // "new lead" in-app Notification below links back to via activityId, the
  // same way every other Notification resolves its href (notification-href
  // .ts). A lead with no free-text message still gets a short note, rather
  // than leaving nothing at all on the Deal explaining how it originated.
  const activity = await db.activity.create({
    data: {
      type: "NOTE",
      content: data.message
        ? `Website inquiry from ${data.name} (${data.email}): "${data.message}"`
        : `Website inquiry from ${data.name} (${data.email})`,
      dealId: deal.id,
    },
  });

  // "notifyNewLead" is one opt-in covering both the in-app bell and the
  // WhatsApp ping — unlike @mention/assignment/status, an unclaimed lead has
  // no natural single recipient, so there's no "everyone this concerns"
  // list to notify in-app for free the way there is for those; it's exactly
  // whoever opted in via Settings → Team, on both channels.
  const recipients = await db.user.findMany({
    where: { role: "ADMIN", notifyNewLead: true },
    select: { id: true },
  });
  if (recipients.length > 0) {
    await db.notification.createMany({
      data: recipients.map((user) => ({
        userId: user.id,
        activityId: activity.id,
        content: `New lead: ${data.name}${companyName ? ` (${companyName})` : ""}`,
      })),
    });
  }
  await notifyNewLeadViaWhatsApp(data.name, companyName ?? "", `/deals/${deal.id}`);

  revalidatePath("/deals");
  revalidatePath("/contacts");
  revalidatePath("/companies");
  revalidatePath("/");

  return { ok: true };
}

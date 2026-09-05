import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { findOrCreateContactByEmail } from "@/lib/contact-matching";
import { getDefaultPipeline } from "@/lib/pipelines";
import { normalizePhone } from "@/lib/phone";

export const leadSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  message: z.string().trim().optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type CreateLeadResult = { ok: true } | { ok: false; error: string };

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
      phone: data.phone ? normalizePhone(data.phone) : null,
      companyId,
      lifecycleStage: "LEAD",
    }),
    getDefaultPipeline(),
  ]);
  const firstStage = defaultPipeline.stages[0];
  if (!firstStage) {
    return { ok: false, error: "The pipeline isn't set up yet — try again shortly." };
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

  if (data.message) {
    await db.activity.create({
      data: {
        type: "NOTE",
        content: `Website inquiry from ${data.name} (${data.email}): "${data.message}"`,
        dealId: deal.id,
      },
    });
  }

  revalidatePath("/deals");
  revalidatePath("/contacts");
  revalidatePath("/companies");
  revalidatePath("/");

  return { ok: true };
}

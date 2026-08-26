"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { findOrCreateContactByEmail } from "@/lib/contact-matching";
import { getDefaultPipeline } from "@/lib/pipelines";
import { normalizePhone } from "@/lib/phone";

const leadSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  message: z.string().trim().optional(),
});

export type LeadFormState = { status: "error"; message: string } | { status: "success" } | undefined;

// Public, unauthenticated — submitted from the marketing-site embed, not a
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
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid submission" };
  }
  const data = parsed.data;

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
    return { status: "error", message: "The pipeline isn't set up yet — try again shortly." };
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

  return { status: "success" };
}

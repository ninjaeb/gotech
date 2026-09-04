"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { callGemini, isAiConfigured } from "@/lib/ai/client";
import { buildTestimonialContext } from "@/lib/ai/context";

const TESTIMONIAL_SYSTEM_PROMPT =
  "You write short customer testimonials in a client's own voice, first person, for a services company. Ground everything only in the context given — never invent specific numbers, dates, or outcomes that aren't present. Sound like a real person who worked with the company, not marketing copy.";

const TestimonialDraftSchema = z.object({
  testimonial: z
    .string()
    .describe(
      "A warm, specific testimonial (2-4 sentences), first person, as if the client wrote it themselves, naturally mentioning the services/products listed in the context. Not generic marketing language.",
    ),
});

// Best-effort — returns null (rather than throwing) on any failure so a
// slow/unconfigured/rate-limited AI service never blocks creating or
// regenerating a request. Callers decide what "no draft" means for them.
async function generateTestimonialDraft(contactId: string): Promise<string | null> {
  if (!isAiConfigured()) return null;
  const context = await buildTestimonialContext(contactId);
  if (!context) return null;
  const result = await callGemini(
    TestimonialDraftSchema,
    TESTIMONIAL_SYSTEM_PROMPT,
    `Here's what we know about this client and what they received:\n\n${context.contextText}\n\nDraft a short testimonial as if ${context.label} wrote it.`,
  );
  return result.status === "ok" ? result.data.testimonial : null;
}

export async function requestTestimonial(contactId: string) {
  await requireAdminAction();
  const token = randomBytes(24).toString("base64url");
  const aiDraft = await generateTestimonialDraft(contactId);
  await db.testimonial.create({ data: { token, contactId, aiDraft } });
  revalidatePath(`/contacts/${contactId}`);
}

// Only overwrites aiDraft when a new one actually came back — a failed
// regenerate (AI down, rate-limited) leaves whatever draft was already
// there untouched instead of wiping it out.
export async function regenerateTestimonialDraft(testimonialId: string) {
  await requireAdminAction();
  const testimonial = await db.testimonial.findUniqueOrThrow({
    where: { id: testimonialId },
    select: { contactId: true, status: true },
  });
  if (testimonial.status !== "PENDING") return;
  const aiDraft = await generateTestimonialDraft(testimonial.contactId);
  if (aiDraft) {
    await db.testimonial.update({ where: { id: testimonialId }, data: { aiDraft } });
  }
  revalidatePath(`/contacts/${testimonial.contactId}`);
}

export async function deleteTestimonialRequest(testimonialId: string, formData: FormData) {
  void formData;
  await requireAdminAction();
  const testimonial = await db.testimonial.delete({
    where: { id: testimonialId },
    select: { contactId: true },
  });
  revalidatePath(`/contacts/${testimonial.contactId}`);
}

const submitSchema = z.object({
  authorName: z.string().trim().min(1, "Your name is required"),
  authorTitle: z.string().trim().optional(),
  content: z.string().trim().min(1, "Please write a few words before submitting"),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

export type SubmitTestimonialState = { status: "error"; message: string } | { status: "success" } | undefined;

// Public, unauthenticated — called from the token-based link page, not a
// logged-in user. Idempotent: revisiting an already-submitted link just
// reports success again rather than erroring or overwriting.
export async function submitTestimonial(
  token: string,
  _prevState: SubmitTestimonialState,
  formData: FormData,
): Promise<SubmitTestimonialState> {
  const testimonial = await db.testimonial.findUnique({
    where: { token },
    select: { id: true, status: true, contactId: true },
  });
  if (!testimonial) {
    return { status: "error", message: "This link is no longer valid." };
  }
  if (testimonial.status === "SUBMITTED") {
    return { status: "success" };
  }

  const parsed = submitSchema.safeParse({
    authorName: formData.get("authorName"),
    authorTitle: formData.get("authorTitle"),
    content: formData.get("content"),
    rating: formData.get("rating") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid submission" };
  }
  const data = parsed.data;

  await db.testimonial.update({
    where: { id: testimonial.id },
    data: {
      status: "SUBMITTED",
      content: data.content,
      rating: data.rating ?? null,
      authorName: data.authorName,
      authorTitle: data.authorTitle || null,
      submittedAt: new Date(),
    },
  });

  revalidatePath(`/testimonial/${token}`);
  revalidatePath(`/contacts/${testimonial.contactId}`);
  return { status: "success" };
}

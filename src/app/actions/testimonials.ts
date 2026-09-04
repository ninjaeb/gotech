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

export type ActionResult = { ok: true } | { ok: false; error: string };
export type ActionResultWith<T> = ({ ok: true } & T) | { ok: false; error: string };

// These three actions return a result object instead of throwing, even for
// unexpected failures (auth check, a DB error). Next.js redacts a thrown
// error's message in production builds — it reaches the client as an opaque
// "Minified React error #NNN" — so relying on error.message from a caught
// throw silently regresses back to "the button doesn't seem to do
// anything," just with extra steps. A returned value isn't subject to that
// redaction, so it's the only reliable way to get a real message in front
// of the user.

export async function requestTestimonial(contactId: string): Promise<ActionResult> {
  try {
    await requireAdminAction();
  } catch {
    return { ok: false, error: "You don't have permission to request testimonials." };
  }
  try {
    const token = randomBytes(24).toString("base64url");
    const aiDraft = await generateTestimonialDraft(contactId);
    await db.testimonial.create({ data: { token, contactId, aiDraft } });
    revalidatePath(`/contacts/${contactId}`);
    return { ok: true };
  } catch (error) {
    console.error("requestTestimonial failed:", error);
    return { ok: false, error: "Something went wrong creating the testimonial request." };
  }
}

// Only overwrites aiDraft when a new one actually came back — a failed
// regenerate (AI down, rate-limited) leaves whatever draft was already
// there untouched instead of wiping it out. Reports whether it actually
// found a new draft, and the draft text itself, so the caller can update
// its own textarea in place instead of always claiming success.
export async function regenerateTestimonialDraft(
  testimonialId: string,
): Promise<ActionResultWith<{ regenerated: boolean; draft: string | null }>> {
  try {
    await requireAdminAction();
  } catch {
    return { ok: false, error: "You don't have permission to do this." };
  }
  try {
    const testimonial = await db.testimonial.findUniqueOrThrow({
      where: { id: testimonialId },
      select: { contactId: true, status: true },
    });
    if (testimonial.status !== "PENDING") return { ok: true, regenerated: false, draft: null };
    const aiDraft = await generateTestimonialDraft(testimonial.contactId);
    if (aiDraft) {
      await db.testimonial.update({ where: { id: testimonialId }, data: { aiDraft } });
    }
    revalidatePath(`/contacts/${testimonial.contactId}`);
    return { ok: true, regenerated: aiDraft !== null, draft: aiDraft };
  } catch (error) {
    console.error("regenerateTestimonialDraft failed:", error);
    return { ok: false, error: "Something went wrong regenerating the draft." };
  }
}

// Lets staff hand-edit the AI draft before the client ever sees it.
export async function updateTestimonialDraft(testimonialId: string, content: string): Promise<ActionResult> {
  try {
    await requireAdminAction();
  } catch {
    return { ok: false, error: "You don't have permission to do this." };
  }
  try {
    const testimonial = await db.testimonial.findUniqueOrThrow({
      where: { id: testimonialId },
      select: { contactId: true, status: true },
    });
    if (testimonial.status !== "PENDING") {
      return { ok: false, error: "This testimonial has already been submitted." };
    }
    await db.testimonial.update({ where: { id: testimonialId }, data: { aiDraft: content } });
    revalidatePath(`/contacts/${testimonial.contactId}`);
    return { ok: true };
  } catch (error) {
    console.error("updateTestimonialDraft failed:", error);
    return { ok: false, error: "Something went wrong saving the draft." };
  }
}

export async function deleteTestimonialRequest(testimonialId: string): Promise<ActionResult> {
  try {
    await requireAdminAction();
  } catch {
    return { ok: false, error: "You don't have permission to do this." };
  }
  try {
    const testimonial = await db.testimonial.delete({
      where: { id: testimonialId },
      select: { contactId: true },
    });
    revalidatePath(`/contacts/${testimonial.contactId}`);
    return { ok: true };
  } catch (error) {
    console.error("deleteTestimonialRequest failed:", error);
    return { ok: false, error: "Something went wrong deleting the request." };
  }
}

const REWRITE_SYSTEM_PROMPT =
  "You improve a customer's own draft testimonial for a services company. Preserve their meaning, facts, and voice exactly — never invent new claims, numbers, or outcomes that aren't already there. Just make it read more clearly and warmly, first person, roughly the same length.";

const RewriteSchema = z.object({
  testimonial: z
    .string()
    .describe("The improved testimonial, first person, preserving the original meaning and facts exactly."),
});

// Public, unauthenticated — the client rewriting their own in-progress
// draft before submitting. Scoped by the same unguessable token as the
// rest of this page; blocked once SUBMITTED so it can't alter a
// testimonial that's already final. An empty box falls back to the same
// context-grounded draft used when the request was first created, so
// "Rewrite with AI" also works as "write this for me" from a blank start.
export async function rewriteTestimonialText(
  token: string,
  currentText: string,
): Promise<ActionResultWith<{ draft: string }>> {
  const testimonial = await db.testimonial.findUnique({
    where: { token },
    select: { id: true, status: true, contactId: true },
  });
  if (!testimonial) return { ok: false, error: "This link is no longer valid." };
  if (testimonial.status === "SUBMITTED") {
    return { ok: false, error: "This testimonial has already been submitted." };
  }
  if (!isAiConfigured()) return { ok: false, error: "AI rewriting isn't available right now." };

  const trimmed = currentText.trim();
  if (!trimmed) {
    const draft = await generateTestimonialDraft(testimonial.contactId);
    if (!draft) return { ok: false, error: "Couldn't generate a draft right now — try again in a moment." };
    return { ok: true, draft };
  }

  const result = await callGemini(
    RewriteSchema,
    REWRITE_SYSTEM_PROMPT,
    `Here is what the client wrote so far:\n\n${trimmed}\n\nImprove the wording — clearer, warmer, better flow — without changing what they actually said or adding anything new.`,
  );
  if (result.status !== "ok") return { ok: false, error: result.message };
  return { ok: true, draft: result.data.testimonial };
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

"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction, requirePartnerAction } from "@/lib/auth/dal";
import { isValidEmailFormat } from "@/lib/email-format";
import { isValidPhoneFormat, normalizePhone } from "@/lib/phone";
import { isRateLimited, isSuspiciouslyFast } from "@/lib/lead-spam-guard";
import { firstHopValue } from "@/lib/site-url";
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES, photoDataUrl } from "@/lib/photo";
import {
  buildPublishedSnapshot,
  DAYS_OF_WEEK,
  ensurePartnerListing,
  isValidSlugFormat,
  isValidTimeString,
  normalizeWebsiteUrl,
  parseServicesInput,
  slugify,
  type OperatingHours,
} from "@/lib/directory";
import { notifyPartnerOfNewLead, sendDirectoryLeadReply } from "@/lib/directory-notify";
import { DIRECTORY_LOCALE_COOKIE } from "@/lib/directory-locale";
import { DEFAULT_DIRECTORY_LOCALE, type DirectoryLeadFormErrorCode, type DirectoryLocale } from "@/lib/directory-i18n";
import { DIRECTORY_LEAD_STATUSES, INDUSTRIES, INDUSTRY_LABELS } from "@/lib/labels";
import { Prisma, type DirectoryLeadStatus, type Industry } from "@/generated/prisma/client";
import { AI_NOT_CONFIGURED, callAi, isAiConfigured, type AiResult } from "@/lib/ai/client";

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

function isDirectoryLocale(value: unknown): value is DirectoryLocale {
  return value === "en" || value === "zh" || value === "ms";
}

// Called directly from the language switcher's onClick (wrapped in
// startTransition), not a form submission — see the cookies() docs on
// Server Functions: setting a cookie here automatically re-renders the
// current route with the new value in the same round trip.
export async function setDirectoryLocale(locale: string): Promise<void> {
  const value = isDirectoryLocale(locale) ? locale : DEFAULT_DIRECTORY_LOCALE;
  const cookieStore = await cookies();
  cookieStore.set(DIRECTORY_LOCALE_COOKIE, value, {
    path: "/directory",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

const directoryLeadSchema = z.object({
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1, "name_required"),
  email: z.string().trim().min(1, "email_required").refine(isValidEmailFormat, { message: "email_invalid" }),
  phone: z
    .string()
    .trim()
    .min(1, "phone_required")
    .refine(isValidPhoneFormat, { message: "phone_invalid" }),
  company: z.string().trim().optional(),
  message: z.string().trim().min(1, "message_required"),
});

export type DirectoryLeadFormState =
  | { status: "error"; code: DirectoryLeadFormErrorCode }
  | { status: "success" }
  | undefined;

// Public, unauthenticated — submitted from a listing's detail page. Same
// honeypot/fast-fill/rate-limit layering as the CRM's own /lead form (see
// src/lib/lead-spam-guard.ts) since this is exactly as exposed to the open
// internet.
export async function submitDirectoryLead(
  _prevState: DirectoryLeadFormState,
  formData: FormData,
): Promise<DirectoryLeadFormState> {
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

  const parsed = directoryLeadSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    company: formData.get("company"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message as DirectoryLeadFormErrorCode) ?? "invalid_submission";
    return { status: "error", code };
  }

  const listing = await db.partnerListing.findUnique({ where: { slug: parsed.data.slug } });
  if (!listing || !listing.publishedSnapshot) {
    return { status: "error", code: "listing_not_found" };
  }

  const locale = (await cookies()).get(DIRECTORY_LOCALE_COOKIE)?.value;

  const lead = await db.directoryLead.create({
    data: {
      listingId: listing.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: normalizePhone(parsed.data.phone),
      company: parsed.data.company || null,
      message: parsed.data.message,
      locale: isDirectoryLocale(locale) ? locale : DEFAULT_DIRECTORY_LOCALE,
    },
  });

  await notifyPartnerOfNewLead(listing, lead);

  return { status: "success" };
}

// ---------------------------------------------------------------------------
// Partner side
// ---------------------------------------------------------------------------

const listingSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required"),
  tagline: z.string().trim().max(140).optional(),
  description: z.string().trim().optional(),
  services: z.string().trim().optional(),
  industry: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || INDUSTRIES.includes(value as Industry), { message: "Invalid industry" }),
  website: z.string().trim().optional(),
  location: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

export type ListingFormValues = {
  companyName: string;
  tagline: string;
  description: string;
  services: string;
  industry: string;
  website: string;
  location: string;
  address: string;
};

// Which field an error belongs to, so the UI can show it right under that
// field instead of a generic banner. Undefined means it's not about one
// particular field (e.g. a bad logo upload).
export type ListingFormField = "companyName" | "services";

export type ListingFormState =
  | { error: string; field?: ListingFormField; values: ListingFormValues }
  | { success: true }
  | undefined;

function stringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function extractListingFormValues(formData: FormData): ListingFormValues {
  return {
    companyName: stringField(formData, "companyName"),
    tagline: stringField(formData, "tagline"),
    description: stringField(formData, "description"),
    services: stringField(formData, "services"),
    industry: stringField(formData, "industry"),
    website: stringField(formData, "website"),
    location: stringField(formData, "location"),
    address: stringField(formData, "address"),
  };
}

// One entry per day of week — see the OperatingHoursEditor component for
// the matching field names (hours-<day>-status/-open/-close). Malformed or
// incomplete input for a day (e.g. "open" but a blank time field) is
// treated as closed rather than rejecting the whole save — permissive,
// same spirit as the rest of this form.
function parseOperatingHoursFormData(formData: FormData): OperatingHours {
  const result = {} as OperatingHours;
  for (const day of DAYS_OF_WEEK) {
    const status = formData.get(`hours-${day}-status`);
    const open = formData.get(`hours-${day}-open`);
    const close = formData.get(`hours-${day}-close`);
    const isOpen =
      status === "open" &&
      typeof open === "string" &&
      isValidTimeString(open) &&
      typeof close === "string" &&
      isValidTimeString(close);
    result[day] = isOpen ? { open: open as string, close: close as string } : null;
  }
  return result;
}

async function parseListingLogo(formData: FormData): Promise<{ logoUrl?: string | null }> {
  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
      throw new Error("Logo must be a JPEG, PNG, WebP, or GIF image.");
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new Error("Logo must be under 3MB.");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    return { logoUrl: photoDataUrl(buffer, file.type) };
  }
  if (formData.get("removeLogo") === "on") {
    return { logoUrl: null };
  }
  return {};
}

const RewrittenTextSchema = z.object({
  text: z.string().describe("The rewritten text, ready to use as-is — no surrounding quotes or commentary."),
});

type ListingRewriteContext = { companyName: string; industry: string; otherField: string };

function listingContextLines(context: ListingRewriteContext, otherFieldLabel: string): string {
  const industryLabel = context.industry ? (INDUSTRY_LABELS[context.industry as Industry] ?? "") : "";
  const lines = [`Company: ${context.companyName || "Unnamed company"}`];
  if (industryLabel) lines.push(`Industry: ${industryLabel}`);
  if (context.otherField.trim()) lines.push(`${otherFieldLabel}: ${context.otherField.trim()}`);
  return lines.join("\n");
}

const LISTING_DESCRIPTION_SYSTEM_PROMPT =
  "You write short, clear 'About us' business descriptions (2-4 sentences) for a public partner directory that lists services companies. Ground everything only in what's given — never invent client names, numbers, awards, or claims that aren't present. Sound professional and specific, not generic marketing filler. The field supports a small formatting syntax: **bold** for emphasis and [link text](https://example.com) for a link — plain paragraphs otherwise, no headings. Use it sparingly, only where it clearly helps (e.g. bolding the company's core specialty); never invent a link that wasn't already present. If the current draft already uses this syntax, preserve it rather than stripping it out.";

// Partner-gated — called from the "Rewrite with AI" button next to the
// About field on the partner's own listing editor. Mirrors
// testimonials.ts's rewriteTestimonialText: improves existing text if
// there's any, otherwise drafts a fresh one from context alone.
export async function rewriteListingDescription(
  currentText: string,
  context: { companyName: string; industry: string; services: string },
): Promise<AiResult<{ text: string }>> {
  await requirePartnerAction();
  if (!isAiConfigured()) return AI_NOT_CONFIGURED;

  const trimmed = currentText.trim();
  const contextLines = listingContextLines({ ...context, otherField: context.services }, "Services offered");
  const prompt = trimmed
    ? `${contextLines}\n\nHere is the current "About us" draft:\n\n${trimmed}\n\nImprove the wording — clearer, more compelling, better flow — without inventing new claims or changing what's actually offered.`
    : `${contextLines}\n\nWrite a short "About us" description for this company's partner directory listing, based only on the information above.`;

  return callAi(RewrittenTextSchema, LISTING_DESCRIPTION_SYSTEM_PROMPT, prompt);
}

const LISTING_SERVICES_SYSTEM_PROMPT =
  "You clean up and organize a list of services or products a business offers, for a directory listing. Respond with one short, clear service name per line — no numbering, no bullets, no explanations, nothing else. Never invent a service that isn't implied by what's given.";

// Same pattern as rewriteListingDescription, for the Services field —
// output stays newline-per-service so it round-trips through
// parseServicesInput unchanged.
export async function rewriteListingServices(
  currentText: string,
  context: { companyName: string; industry: string; description: string },
): Promise<AiResult<{ text: string }>> {
  await requirePartnerAction();
  if (!isAiConfigured()) return AI_NOT_CONFIGURED;

  const trimmed = currentText.trim();
  const contextLines = listingContextLines({ ...context, otherField: context.description }, "About us");
  const prompt = trimmed
    ? `${contextLines}\n\nHere is the current services list, one per line:\n\n${trimmed}\n\nClean up the wording and naming — clearer, more specific — without adding services that aren't already there or removing any.`
    : `${contextLines}\n\nList the services this company likely offers for its partner directory listing, one per line, based only on the information above.`;

  return callAi(RewrittenTextSchema, LISTING_SERVICES_SYSTEM_PROMPT, prompt);
}

type ListingSaveResult =
  | { ok: false; error: string; field?: ListingFormField; values: ListingFormValues }
  | { ok: true; listing: Awaited<ReturnType<typeof db.partnerListing.update>> };

// Shared by saveDirectoryListing and submitDirectoryListingForReview below,
// so "Submit for review" always validates and saves exactly what's
// currently in the form — never a stale save from before this edit, which
// is what made "you have services typed in but it says you don't" possible
// before this was one step. `extraData` lets the submit flow fold its own
// status transition into the very same write.
async function saveListingFields(
  partner: { id: string; name: string },
  formData: FormData,
  extraData: { status: "PENDING_REVIEW"; submittedAt: Date } | Record<string, never> = {},
): Promise<ListingSaveResult> {
  const values = extractListingFormValues(formData);
  const parsed = listingSchema.safeParse(values);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0] === "companyName" ? "companyName" : undefined;
    return { ok: false, error: issue?.message ?? "Invalid listing", field, values };
  }

  let logo: Awaited<ReturnType<typeof parseListingLogo>>;
  try {
    logo = await parseListingLogo(formData);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid logo", values };
  }

  const listing = await ensurePartnerListing(partner.id, partner.name);
  const resetToDraft = listing.status === "PUBLISHED" || listing.status === "REJECTED";

  const updated = await db.partnerListing.update({
    where: { id: listing.id },
    data: {
      companyName: parsed.data.companyName,
      tagline: parsed.data.tagline || null,
      description: parsed.data.description || null,
      services: parseServicesInput(parsed.data.services ?? ""),
      industry: (parsed.data.industry || null) as Industry | null,
      website: parsed.data.website ? normalizeWebsiteUrl(parsed.data.website) : null,
      location: parsed.data.location || null,
      address: parsed.data.address || null,
      operatingHours: parseOperatingHoursFormData(formData),
      ...logo,
      ...(resetToDraft ? { status: "DRAFT" as const, reviewNote: null } : {}),
      ...extraData,
    },
  });
  return { ok: true, listing: updated };
}

// Saves the partner's working draft. Never touches the public page by
// itself — see PartnerListing.publishedSnapshot in schema.prisma — but
// editing after an approval or rejection resets status back to DRAFT, since
// whatever an admin last reviewed no longer matches what's on screen; only
// submitDirectoryListingForReview below asks for another look.
export async function saveDirectoryListing(
  _prevState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const partner = await requirePartnerAction();
  const result = await saveListingFields(partner, formData);
  if (!result.ok) return { error: result.error, field: result.field, values: result.values };

  revalidatePath("/partner");
  revalidatePath("/partner/listing");
  if (result.listing.publishedSnapshot) revalidatePath(`/directory/${result.listing.slug}`);
  return { success: true };
}

export type UpdateSlugState = { error: string; slug: string } | { success: true; slug: string } | undefined;

// Separate from saveDirectoryListing on purpose: the slug is the address a
// visitor's link points at, not part of what an admin reviews — changing
// it takes effect immediately regardless of DRAFT/PENDING_REVIEW/PUBLISHED
// status, and never resets that status the way editing content does.
// Whoever had the old link gets a 404; nothing else about the listing
// changes.
export async function updateListingSlug(
  _prevState: UpdateSlugState,
  formData: FormData,
): Promise<UpdateSlugState> {
  const partner = await requirePartnerAction();
  const raw = String(formData.get("slug") || "");
  const normalized = slugify(raw);
  if (!isValidSlugFormat(normalized)) {
    return { error: "Enter at least 3 letters, numbers, or hyphens.", slug: raw };
  }

  const listing = await ensurePartnerListing(partner.id, partner.name);
  if (normalized === listing.slug) {
    return { success: true, slug: normalized };
  }

  const existing = await db.partnerListing.findUnique({ where: { slug: normalized }, select: { id: true } });
  if (existing) {
    return { error: "That URL is already taken — try a different one.", slug: raw };
  }

  await db.partnerListing.update({ where: { id: listing.id }, data: { slug: normalized } });
  revalidatePath("/partner/listing");
  revalidatePath("/directory");
  revalidatePath(`/directory/${listing.slug}`);
  revalidatePath(`/directory/${normalized}`);
  return { success: true, slug: normalized };
}

export type SubmitListingState =
  | { error: string; field?: ListingFormField }
  | { success: true }
  | undefined;

// Saves the current form contents and, if they include a name and at least
// one service, asks an admin to review them — an empty shell isn't worth
// anyone's review time.
export async function submitDirectoryListingForReview(
  _prevState: SubmitListingState,
  formData: FormData,
): Promise<SubmitListingState> {
  const partner = await requirePartnerAction();

  const values = extractListingFormValues(formData);
  if (!values.companyName.trim()) {
    return { error: "Add a company name before submitting.", field: "companyName" };
  }
  if (parseServicesInput(values.services).length === 0) {
    return { error: "List at least one service before submitting.", field: "services" };
  }

  const result = await saveListingFields(partner, formData, {
    status: "PENDING_REVIEW",
    submittedAt: new Date(),
  });
  if (!result.ok) return { error: result.error, field: result.field };

  revalidatePath("/partner");
  revalidatePath("/partner/listing");
  revalidatePath("/settings/directory");
  return { success: true };
}

async function ownedLeadOrThrow(leadId: string, partnerId: string) {
  const lead = await db.directoryLead.findFirst({
    where: { id: leadId, listing: { partnerId } },
    include: { listing: true },
  });
  if (!lead) throw new Error("Lead not found.");
  return lead;
}

export async function updateDirectoryLeadStatus(leadId: string, formData: FormData): Promise<void> {
  const partner = await requirePartnerAction();
  const status = formData.get("status");
  if (typeof status !== "string" || !DIRECTORY_LEAD_STATUSES.includes(status as DirectoryLeadStatus)) {
    throw new Error("Invalid status.");
  }
  const lead = await ownedLeadOrThrow(leadId, partner.id);

  const isClosing = status === "WON" || status === "LOST";
  // undefined leaves the column untouched (Prisma omits it); only the two
  // real transitions — first closing, and reopening a previously-closed
  // lead — actually need to write a new value.
  let closedAt: Date | null | undefined;
  if (isClosing) closedAt = lead.closedAt ?? new Date();
  else if (lead.closedAt) closedAt = null;

  await db.directoryLead.update({
    where: { id: lead.id },
    data: {
      status: status as DirectoryLeadStatus,
      pickedUpAt: !lead.pickedUpAt && status !== "NEW" ? new Date() : undefined,
      closedAt,
    },
  });
  revalidatePath("/partner");
  revalidatePath("/partner/directory-leads");
  revalidatePath(`/partner/directory-leads/${lead.id}`);
}

const leadDetailsSchema = z.object({
  value: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || (!Number.isNaN(Number(value)) && Number(value) >= 0), {
      message: "Enter a value of 0 or more",
    }),
  notes: z.string().trim().optional(),
});

export async function updateDirectoryLeadDetails(
  leadId: string,
  _prevState: { error: string } | { success: true } | undefined,
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  const partner = await requirePartnerAction();
  const parsed = leadDetailsSchema.safeParse({ value: formData.get("value"), notes: formData.get("notes") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const lead = await ownedLeadOrThrow(leadId, partner.id);

  await db.directoryLead.update({
    where: { id: lead.id },
    data: { value: parsed.data.value, notes: parsed.data.notes || null },
  });
  revalidatePath("/partner");
  revalidatePath(`/partner/directory-leads/${lead.id}`);
  return { success: true };
}

const replySchema = z.object({
  body: z.string().trim().min(1, "Write a reply before sending."),
});

export type ReplyFormState = { error: string } | { success: true } | undefined;

// Sends the partner's reply by email from Gotka's own system address (never
// the partner's own — see src/lib/directory-notify.ts) and logs it either
// way, so a delivery failure doesn't erase what the partner wrote.
export async function replyToDirectoryLead(
  leadId: string,
  _prevState: ReplyFormState,
  formData: FormData,
): Promise<ReplyFormState> {
  const partner = await requirePartnerAction();
  const parsed = replySchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid reply" };
  }
  const lead = await ownedLeadOrThrow(leadId, partner.id);

  const result = await sendDirectoryLeadReply(lead.listing, lead, parsed.data.body);

  await db.$transaction([
    db.directoryLeadReply.create({
      data: {
        leadId: lead.id,
        authorId: partner.id,
        body: parsed.data.body,
        sentAt: result.sent ? new Date() : null,
        sendError: result.sent ? null : result.error,
      },
    }),
    db.directoryLead.update({
      where: { id: lead.id },
      data: { firstRepliedAt: lead.firstRepliedAt ?? new Date() },
    }),
  ]);

  revalidatePath(`/partner/directory-leads/${lead.id}`);
  if (!result.sent) return { error: `Saved, but the email didn't send: ${result.error}` };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Admin side
// ---------------------------------------------------------------------------

export async function approveDirectoryListing(id: string): Promise<void> {
  await requireAdminAction();
  const listing = await db.partnerListing.findUniqueOrThrow({ where: { id } });
  await db.partnerListing.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      reviewedAt: new Date(),
      reviewNote: null,
      publishedSnapshot: buildPublishedSnapshot(listing),
    },
  });
  revalidatePath("/settings/directory");
  revalidatePath("/directory");
  revalidatePath(`/directory/${listing.slug}`);
}

const rejectSchema = z.object({
  note: z.string().trim().min(1, "Explain what needs to change so the partner can fix it."),
});

export async function rejectDirectoryListing(id: string, formData: FormData): Promise<void> {
  await requireAdminAction();
  const parsed = rejectSchema.safeParse({ note: formData.get("note") });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "A note is required.");
  }
  await db.partnerListing.update({
    where: { id },
    data: { status: "REJECTED", reviewNote: parsed.data.note, reviewedAt: new Date() },
  });
  revalidatePath("/settings/directory");
}

// Pulls a listing off the public directory without touching the partner's
// own draft — for a listing that turns out to be inappropriate or stale.
// The partner can resubmit once they've addressed why.
export async function unpublishDirectoryListing(id: string): Promise<void> {
  await requireAdminAction();
  const listing = await db.partnerListing.update({
    where: { id },
    data: { publishedSnapshot: Prisma.JsonNull, status: "DRAFT" },
  });
  revalidatePath("/settings/directory");
  revalidatePath("/directory");
  revalidatePath(`/directory/${listing.slug}`);
}

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
  ensurePartnerListing,
  normalizeWebsiteUrl,
  parseServicesInput,
  servicesFromJson,
} from "@/lib/directory";
import { notifyPartnerOfNewLead, sendDirectoryLeadReply } from "@/lib/directory-notify";
import { DIRECTORY_LOCALE_COOKIE } from "@/lib/directory-locale";
import { DEFAULT_DIRECTORY_LOCALE, type DirectoryLeadFormErrorCode, type DirectoryLocale } from "@/lib/directory-i18n";
import { DIRECTORY_LEAD_STATUSES, INDUSTRIES } from "@/lib/labels";
import { Prisma, type DirectoryLeadStatus, type Industry } from "@/generated/prisma/client";

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
});

export type ListingFormValues = {
  companyName: string;
  tagline: string;
  description: string;
  services: string;
  industry: string;
  website: string;
  location: string;
};

export type ListingFormState = { error: string; values: ListingFormValues } | { success: true } | undefined;

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
  };
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

// Saves the partner's working draft. Never touches the public page by
// itself — see PartnerListing.publishedSnapshot in schema.prisma — but
// editing after an approval or rejection resets status back to DRAFT, since
// whatever an admin last reviewed no longer matches what's on screen; only
// submitPartnerListingForReview below asks for another look.
export async function saveDirectoryListing(
  _prevState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const partner = await requirePartnerAction();
  const values = extractListingFormValues(formData);
  const parsed = listingSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid listing", values };
  }

  let logo: Awaited<ReturnType<typeof parseListingLogo>>;
  try {
    logo = await parseListingLogo(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid logo", values };
  }

  const listing = await ensurePartnerListing(partner.id, partner.name);
  const resetToDraft = listing.status === "PUBLISHED" || listing.status === "REJECTED";

  await db.partnerListing.update({
    where: { id: listing.id },
    data: {
      companyName: parsed.data.companyName,
      tagline: parsed.data.tagline || null,
      description: parsed.data.description || null,
      services: parseServicesInput(parsed.data.services ?? ""),
      industry: (parsed.data.industry || null) as Industry | null,
      website: parsed.data.website ? normalizeWebsiteUrl(parsed.data.website) : null,
      location: parsed.data.location || null,
      ...logo,
      ...(resetToDraft ? { status: "DRAFT" as const, reviewNote: null } : {}),
    },
  });

  revalidatePath("/partner");
  revalidatePath("/partner/listing");
  if (listing.publishedSnapshot) revalidatePath(`/directory/${listing.slug}`);
  return { success: true };
}

// Asks an admin to look at the current draft. Requires at least a name and
// one service — an empty shell isn't worth anyone's review time.
export async function submitDirectoryListingForReview(): Promise<{ error: string } | { success: true }> {
  const partner = await requirePartnerAction();
  const listing = await db.partnerListing.findUnique({ where: { partnerId: partner.id } });
  if (!listing) return { error: "Save your listing details first." };
  if (!listing.companyName.trim()) return { error: "Add a company name before submitting." };
  if (servicesFromJson(listing.services).length === 0) {
    return { error: "List at least one service before submitting." };
  }

  await db.partnerListing.update({
    where: { id: listing.id },
    data: { status: "PENDING_REVIEW", submittedAt: new Date(), reviewNote: null },
  });
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

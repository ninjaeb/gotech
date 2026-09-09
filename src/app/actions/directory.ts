"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction, requirePartnerAction } from "@/lib/auth/dal";
import { isValidEmailFormat } from "@/lib/email-format";
import { isValidPhoneFormat, normalizePhone } from "@/lib/phone";
import { isRateLimited, isSuspiciouslyFast } from "@/lib/lead-spam-guard";
import { firstHopValue } from "@/lib/site-url";
import { DIRECTORY_REFERRAL_COOKIE, findPartnerByReferralCode } from "@/lib/referrals";
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES, photoDataUrl } from "@/lib/photo";
import {
  buildPublishedSnapshot,
  createPartnerListing,
  DAYS_OF_WEEK,
  getOwnedListing,
  isValidSlugFormat,
  isValidTimeString,
  normalizeWebsiteUrl,
  parseFaqsJson,
  parseServicesJson,
  slugify,
  translationsFromJson,
  type FaqEntry,
  type ListingTranslations,
  type OperatingHours,
  type ServiceEntry,
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
// startTransition) alongside a real navigation to the locale-prefixed URL
// (see directory-language-switcher.tsx) — this just keeps the "last
// preferred language" cookie current for whenever there's no URL segment
// to read it from instead: a fresh "/" visit, an old un-prefixed bookmark
// (src/app/directory/page.tsx's redirect), or /business/login, which
// shares this same header but isn't part of the locale-prefixed tree.
// path: "/" (not just "/directory") so it's readable from all of those.
export async function setDirectoryLocale(locale: string): Promise<void> {
  const value = isDirectoryLocale(locale) ? locale : DEFAULT_DIRECTORY_LOCALE;
  const cookieStore = await cookies();
  cookieStore.set(DIRECTORY_LOCALE_COOKIE, value, {
    path: "/",
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

  // The page's own URL is the source of truth for locale (see
  // src/app/[locale]/directory/[slug]/page.tsx) — the form carries it
  // explicitly (see directory-lead-form.tsx); the cookie is only a
  // fallback for an old cached page that predates that hidden field.
  const cookieStore = await cookies();
  const formLocale = formData.get("locale");
  const locale = isDirectoryLocale(formLocale) ? formLocale : cookieStore.get(DIRECTORY_LOCALE_COOKIE)?.value;

  // Credit the partner whose "Recommend" link brought this visitor here
  // (see src/app/r/[code]/route.ts) — but never the listing's own partner,
  // who'd otherwise be able to refer leads to themselves.
  const referrer = await findPartnerByReferralCode(cookieStore.get(DIRECTORY_REFERRAL_COOKIE)?.value);
  const referredById = referrer && referrer.id !== listing.partnerId ? referrer.id : null;

  const lead = await db.directoryLead.create({
    data: {
      listingId: listing.id,
      referredById,
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
  industry: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || INDUSTRIES.includes(value as Industry), { message: "Invalid industry" }),
  website: z.string().trim().optional(),
  address: z.string().trim().optional(),
  seoTitle: z.string().trim().max(100).optional(),
  seoDescription: z.string().trim().max(300).optional(),
});

export type ListingFormValues = {
  companyName: string;
  tagline: string;
  description: string;
  services: ServiceEntry[];
  industry: string;
  website: string;
  address: string;
  faqs: FaqEntry[];
  categoryIds: string[];
  translations: ListingTranslations;
  seoTitle: string;
  seoDescription: string;
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

// Both zh and ms are always read together (a partner never translates just
// one). Tagline/description are plain named fields, same as their English
// counterparts; services/faqs are per-locale hidden JSON inputs (see
// ServicesEditor/FaqEditor, rendered once per language tab in
// partner-listing-form.tsx) parsed the same way as the primary services/
// faqs fields below.
function extractTranslations(formData: FormData): ListingTranslations {
  return translationsFromJson({
    zh: {
      tagline: stringField(formData, "zhTagline"),
      description: stringField(formData, "zhDescription"),
      services: parseServicesJson(stringField(formData, "zhServices")),
      faqs: parseFaqsJson(stringField(formData, "zhFaqs")),
    },
    ms: {
      tagline: stringField(formData, "msTagline"),
      description: stringField(formData, "msDescription"),
      services: parseServicesJson(stringField(formData, "msServices")),
      faqs: parseFaqsJson(stringField(formData, "msFaqs")),
    },
  });
}

// services isn't part of listingSchema below — like operatingHours, it's
// structured data (see ServicesEditor's hidden JSON input), sanitized by
// parseServicesJson itself rather than a plain string Zod rule. categoryIds
// is a checkbox group (see PartnerListingForm) — reconciled against real
// BusinessCategory rows in saveListingFields, not validated here.
function extractListingFormValues(formData: FormData): ListingFormValues {
  return {
    companyName: stringField(formData, "companyName"),
    tagline: stringField(formData, "tagline"),
    description: stringField(formData, "description"),
    services: parseServicesJson(stringField(formData, "services")),
    industry: stringField(formData, "industry"),
    website: stringField(formData, "website"),
    address: stringField(formData, "address"),
    faqs: parseFaqsJson(stringField(formData, "faqs")),
    categoryIds: formData.getAll("categoryIds").filter((value): value is string => typeof value === "string"),
    translations: extractTranslations(formData),
    seoTitle: stringField(formData, "seoTitle"),
    seoDescription: stringField(formData, "seoDescription"),
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
  "You write 'About us' business descriptions for a public partner directory, optimized for both traditional search engines (SEO) and AI answer engines (GEO — generative engine optimization): natural, keyword-rich language that names the company's actual services, industry, and location wherever they're given, plus some clear, factual, directly-quotable sentences an AI system could confidently summarize or cite. Ground everything only in what's given — never invent client names, numbers, awards, locations, or claims that aren't present. Sound professional and specific, not generic marketing filler. Thorough is better than short: never produce something shorter than the current draft — expand it with more relevant detail (what the company does, who it's for, how, and what makes it different) rather than trimming or condensing. The field supports a small formatting syntax: **bold** for emphasis, bullet/numbered lists, and [link text](https://example.com) for a link — no headings. Use formatting sparingly, only where it clearly helps; never invent a link that wasn't already present. If the current draft already uses this syntax, preserve it rather than stripping it out.";

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
    ? `${contextLines}\n\nHere is the current "About us" draft:\n\n${trimmed}\n\nExpand and rewrite it to be more thorough and optimized for SEO and GEO — do not make it shorter; add more relevant detail — without inventing new claims or changing what's actually offered.`
    : `${contextLines}\n\nWrite a thorough "About us" description for this company's partner directory listing, optimized for SEO and GEO, based only on the information above.`;

  return callAi(RewrittenTextSchema, LISTING_DESCRIPTION_SYSTEM_PROMPT, prompt);
}

const ServiceListSchema = z.object({
  services: z
    .array(
      z.object({
        title: z.string().describe("Short service or product name."),
        description: z.string().describe("One short sentence describing what it includes."),
      }),
    )
    .describe("The cleaned-up (or, if none existed yet, newly drafted) list of services/products."),
});

const LISTING_SERVICES_SYSTEM_PROMPT =
  "You clean up and organize the services or products a business offers, for a directory listing — a short title plus a one-sentence description for each. Ground everything only in what's given — never invent a service, or a description detail, that isn't implied by the company's other information. Never invent pricing — that's set separately and isn't part of what you write.";

// Same improve-existing-or-draft-fresh pattern as rewriteListingDescription.
// Only title/description go through the model — price is a partner-only
// manual field the AI never sees or touches; the caller (see
// handleRewriteServices in partner-listing-form.tsx) re-attaches each
// existing entry's price by index once this returns.
export async function rewriteListingServices(
  currentServices: { title: string; description: string }[],
  context: { companyName: string; industry: string; description: string },
): Promise<AiResult<{ services: { title: string; description: string }[] }>> {
  await requirePartnerAction();
  if (!isAiConfigured()) return AI_NOT_CONFIGURED;

  const contextLines = listingContextLines({ ...context, otherField: context.description }, "About us");
  const currentList = currentServices
    .filter((entry) => entry.title.trim())
    .map((entry) => `- ${entry.title}${entry.description ? `: ${entry.description}` : ""}`)
    .join("\n");
  const prompt = currentList
    ? `${contextLines}\n\nHere is the current services list:\n\n${currentList}\n\nClean up the wording — clearer titles, a short description for each — without adding services that aren't already there or removing any.`
    : `${contextLines}\n\nList the services this company likely offers for its partner directory listing, each with a short title and a one-sentence description, based only on the information above.`;

  return callAi(ServiceListSchema, LISTING_SERVICES_SYSTEM_PROMPT, prompt);
}

const SeoMetaSchema = z.object({
  title: z.string().describe("SEO title tag, ideally 50-60 characters. Include the company name."),
  description: z.string().describe("SEO meta description, ideally 140-160 characters — compelling and specific, not generic."),
});

const LISTING_SEO_SYSTEM_PROMPT =
  "You write SEO title tags and meta descriptions for a business's page on a public partner directory — the text search engines show as the blue link and snippet, and what a social platform shows when the page's link is shared. Ground everything only in what's given — never invent client names, numbers, awards, or claims that aren't present. Specific and inviting, not generic marketing filler ('Welcome to our website'). The title and description should complement each other, not repeat the same sentence twice.";

// Partner-gated — called from the "Generate with AI" button next to the
// listing editor's Search & social preview fields. Writes both together in
// one call (rather than two separate rewrite actions, like the About/
// Services fields have) since a good title and description are written as
// a matched pair, not independently. Same improve-existing-or-draft-fresh
// pattern as rewriteListingDescription/rewriteListingServices.
export async function generateListingSeoMeta(
  current: { title: string; description: string },
  context: { companyName: string; industry: string; description: string; services: string },
): Promise<AiResult<{ title: string; description: string }>> {
  await requirePartnerAction();
  if (!isAiConfigured()) return AI_NOT_CONFIGURED;

  const contextLines = listingContextLines({ ...context, otherField: context.services }, "Services offered");
  const aboutLine = context.description.trim() ? `About us text: ${context.description.trim()}` : "";
  const hasCurrent = current.title.trim() || current.description.trim();
  const prompt = hasCurrent
    ? `${contextLines}\n${aboutLine}\n\nCurrent SEO title: ${current.title.trim() || "(none set)"}\nCurrent SEO description: ${current.description.trim() || "(none set)"}\n\nImprove both — clearer, more compelling, better matched to each other — without inventing new claims.`
    : `${contextLines}\n${aboutLine}\n\nWrite an SEO title and meta description for this company's page on the Gotka partner directory, based only on the information above.`;

  return callAi(SeoMetaSchema, LISTING_SEO_SYSTEM_PROMPT, prompt);
}

const FaqListSchema = z.object({
  faqs: z
    .array(
      z.object({
        question: z.string().describe("A question a prospective customer would plausibly ask."),
        answer: z.string().describe("A direct, factual 1-3 sentence answer, grounded only in the company's given information."),
      }),
    )
    .describe("The cleaned-up (or, if none existed yet, newly drafted) list of frequently asked questions."),
});

const LISTING_FAQ_SYSTEM_PROMPT =
  "You write FAQ entries for a business's page on a public partner directory — clear, directly-answerable Q&A that both search engines and AI answer engines can quote or summarize confidently (this is GEO: generative/AI-answer-engine optimization). Ground every answer only in what's given — never invent hours, pricing, service details, locations, or policies that aren't stated. Cover the questions a real prospective customer would actually ask — what the business does, who it's for, where it operates, and (only if the given information supports it) hours, pricing, or how to get started. Never write a question whose answer isn't actually grounded in what's given.";

// Partner-gated — called from the "Generate with AI" button next to the
// listing editor's FAQ section. Same improve-existing-or-draft-fresh
// pattern as the other rewrite/generate actions above.
export async function generateListingFaqs(
  currentFaqs: { question: string; answer: string }[],
  context: { companyName: string; industry: string; description: string; services: string },
): Promise<AiResult<{ faqs: { question: string; answer: string }[] }>> {
  await requirePartnerAction();
  if (!isAiConfigured()) return AI_NOT_CONFIGURED;

  const contextLines = listingContextLines({ ...context, otherField: context.services }, "Services offered");
  const aboutLine = context.description.trim() ? `About us text: ${context.description.trim()}` : "";
  const currentList = currentFaqs
    .filter((faq) => faq.question.trim())
    .map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
    .join("\n\n");
  const prompt = currentList
    ? `${contextLines}\n${aboutLine}\n\nHere are the current FAQ entries:\n\n${currentList}\n\nImprove the wording — clearer, more directly answerable — without inventing new claims, and without removing any.`
    : `${contextLines}\n${aboutLine}\n\nWrite 4-6 FAQ entries for this company's page on the Gotka partner directory, based only on the information above.`;

  return callAi(FaqListSchema, LISTING_FAQ_SYSTEM_PROMPT, prompt);
}

const TranslatedServiceSchema = z.object({
  title: z.string().describe("Translation of the service/product title."),
  description: z.string().describe("Translation of the service/product description. Empty string if it's empty."),
});
const TranslatedFaqSchema = z.object({
  question: z.string().describe("Translation of the FAQ question."),
  answer: z.string().describe("Translation of the FAQ answer."),
});
const TranslationLocaleSchema = z.object({
  tagline: z.string().describe("Translation of the tagline. Empty string if the tagline is empty."),
  description: z.string().describe("Translation of the About text. Empty string if it's empty."),
  services: z
    .array(TranslatedServiceSchema)
    .describe("Translation of each service/product, in the same order as given — one entry per source entry."),
  faqs: z
    .array(TranslatedFaqSchema)
    .describe("Translation of each FAQ entry, in the same order as given — one entry per source entry."),
});
const TranslationSchema = z.object({
  zh: TranslationLocaleSchema.describe("Simplified Chinese translation of everything below."),
  ms: TranslationLocaleSchema.describe("Malay (Bahasa Malaysia) translation of everything below."),
});

const LISTING_TRANSLATION_SYSTEM_PROMPT =
  "You translate a business's partner directory listing — its tagline, 'About us' text, list of services/products, and FAQ entries — into Simplified Chinese and Malay (Bahasa Malaysia), for a multi-language public directory. Translate faithfully — never invent, drop, embellish, or add claims that aren't in the source text — but write naturally and idiomatically in each target language rather than a stiff word-for-word rendering. The About text may use a small formatting syntax: **bold**, bullet/numbered lists ('- item' / '1. item'), and [link text](url) links — preserve this syntax exactly around the translated text, never strip or alter it. The services and FAQ lists must come back in the same order and count as given — exactly one translated entry per source entry, never merged, split, added, or dropped. The company name itself is never translated and isn't part of what you're given. If a field is empty (or a list has no entries) in the source, return an empty string (or empty list) for it in both languages.";

// Partner-gated — called from the "Translate with AI" button next to the
// listing editor's language tabs. Unlike the other rewrite/generate
// actions, there's no "current translation" to improve: the source of
// truth is always the primary (English) tagline/description/services/faqs,
// so every call is a fresh translation from those, in both target languages
// at once (they're wanted together, not one at a time). Services go through
// title/description only — like rewriteListingServices, price is a
// partner-only manual field the AI never sees; the caller (handleTranslate
// in partner-listing-form.tsx) re-attaches each existing entry's price by
// index once this returns.
export async function translateListingContent(current: {
  tagline: string;
  description: string;
  services: { title: string; description: string }[];
  faqs: { question: string; answer: string }[];
}): Promise<
  AiResult<{
    zh: { tagline: string; description: string; services: { title: string; description: string }[]; faqs: { question: string; answer: string }[] };
    ms: { tagline: string; description: string; services: { title: string; description: string }[]; faqs: { question: string; answer: string }[] };
  }>
> {
  await requirePartnerAction();
  if (!isAiConfigured()) return AI_NOT_CONFIGURED;
  const services = current.services.filter((entry) => entry.title.trim());
  const faqs = current.faqs.filter((entry) => entry.question.trim());
  if (!current.tagline.trim() && !current.description.trim() && services.length === 0 && faqs.length === 0) {
    return { status: "error", message: "Add some listing content before translating." };
  }

  const servicesList = services
    .map((entry, i) => `${i + 1}. ${entry.title}${entry.description ? `: ${entry.description}` : ""}`)
    .join("\n");
  const faqsList = faqs.map((entry, i) => `${i + 1}. Q: ${entry.question}\n   A: ${entry.answer}`).join("\n");
  const prompt = [
    `Tagline: ${current.tagline.trim() || "(none)"}`,
    `About us:\n${current.description.trim() || "(none)"}`,
    `Services/products (${services.length}):\n${servicesList || "(none)"}`,
    `FAQ (${faqs.length}):\n${faqsList || "(none)"}`,
    "Translate all of the above into Simplified Chinese and Malay, keeping the services and FAQ lists in the same order and count as given.",
  ].join("\n\n");
  return callAi(TranslationSchema, LISTING_TRANSLATION_SYSTEM_PROMPT, prompt);
}

// Creates a blank draft listing and drops the partner straight into its
// editor — the explicit, visible equivalent of what the old single-listing
// ensurePartnerListing used to do silently on first page load. A plain
// action (no useActionState) since there's no form input to validate: the
// "+ New listing" button just needs a row to exist before it can navigate
// to it.
export async function createListingAction(): Promise<never> {
  const partner = await requirePartnerAction();
  const listing = await createPartnerListing(partner.id, partner.name);
  revalidatePath("/business/listings");
  redirect(`/business/listings/${listing.id}`);
}

type ListingSaveResult =
  | { ok: false; error: string; field?: ListingFormField; values: ListingFormValues }
  | { ok: true; listing: Awaited<ReturnType<typeof db.partnerListing.update>> };

// Shared by saveDirectoryListing and submitDirectoryListingForReview below,
// so "Submit for review" always validates and saves exactly what's
// currently in the form — never a stale save from before this edit, which
// is what made "you have services typed in but it says you don't" possible
// before this was one step. `extraData` lets the submit flow fold its own
// status transition into the very same write. `listingId` is checked
// against the calling partner via getOwnedListing before anything is read
// or written — a partner's own request could in principle name any listing
// id, and only one they actually own may ever be touched here.
async function saveListingFields(
  partner: { id: string; name: string },
  listingId: string,
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

  const listing = await getOwnedListing(listingId, partner.id);
  if (!listing) {
    return { ok: false, error: "Listing not found.", values };
  }
  const resetToDraft = listing.status === "PUBLISHED" || listing.status === "REJECTED";

  // Reconciled against real rows rather than trusted as-is — a checkbox's
  // value is just a string an authenticated partner's own request could in
  // principle tamper with, and a stale id (its category was since deleted)
  // should just drop silently rather than fail the whole save.
  const requestedCategoryIds = formData.getAll("categoryIds").filter((value): value is string => typeof value === "string");
  const categoryIds = requestedCategoryIds.length
    ? [
        ...new Set(
          (await db.businessCategory.findMany({ where: { id: { in: requestedCategoryIds } }, select: { id: true } })).map(
            (category) => category.id,
          ),
        ),
      ]
    : [];

  // A fixed-length tuple (no spread) so $transaction's return type stays a
  // tuple too — `updated` below narrows to the update's own result rather
  // than a union across all three statements. Delete-then-recreate is
  // simpler than diffing for a set this small, same reasoning as
  // parseOperatingHoursFormData's own full-replace-every-save approach.
  const [updated] = await db.$transaction([
    db.partnerListing.update({
      where: { id: listing.id },
      data: {
        companyName: parsed.data.companyName,
        tagline: parsed.data.tagline || null,
        description: parsed.data.description || null,
        services: parseServicesJson(stringField(formData, "services")),
        industry: (parsed.data.industry || null) as Industry | null,
        website: parsed.data.website ? normalizeWebsiteUrl(parsed.data.website) : null,
        address: parsed.data.address || null,
        operatingHours: parseOperatingHoursFormData(formData),
        faqs: parseFaqsJson(stringField(formData, "faqs")),
        translations: extractTranslations(formData),
        seoTitle: parsed.data.seoTitle || null,
        seoDescription: parsed.data.seoDescription || null,
        ...logo,
        ...(resetToDraft ? { status: "DRAFT" as const, reviewNote: null } : {}),
        ...extraData,
      },
    }),
    db.partnerListingCategory.deleteMany({ where: { listingId: listing.id } }),
    db.partnerListingCategory.createMany({ data: categoryIds.map((categoryId) => ({ listingId: listing.id, categoryId })) }),
  ]);
  return { ok: true, listing: updated };
}

// Saves the partner's working draft. Never touches the public page by
// itself — see PartnerListing.publishedSnapshot in schema.prisma — but
// editing after an approval or rejection resets status back to DRAFT, since
// whatever an admin last reviewed no longer matches what's on screen; only
// submitDirectoryListingForReview below asks for another look. `listingId`
// is bound in by the form component (see PartnerListingForm) — the first
// argument to a useActionState action, ahead of the (prevState, formData)
// pair React itself supplies.
export async function saveDirectoryListing(
  listingId: string,
  _prevState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const partner = await requirePartnerAction();
  const result = await saveListingFields(partner, listingId, formData);
  if (!result.ok) return { error: result.error, field: result.field, values: result.values };

  revalidatePath("/business");
  revalidatePath("/business/listings");
  revalidatePath(`/business/listings/${listingId}`);
  if (result.listing.publishedSnapshot) revalidatePath(`/directory/${result.listing.slug}`);
  return { success: true };
}

export type UpdateSlugState = { error: string; slug: string } | { success: true; slug: string } | undefined;

// Separate from saveDirectoryListing on purpose: the slug is the address a
// visitor's link points at, not part of what an admin reviews — changing
// it takes effect immediately regardless of DRAFT/PENDING_REVIEW/PUBLISHED
// status, and never resets that status the way editing content does.
// Whoever had the old link gets a 404; nothing else about the listing
// changes. `listingId` is bound in the same way as saveDirectoryListing's
// (see PartnerSlugForm) and checked the same way via getOwnedListing.
export async function updateListingSlug(
  listingId: string,
  _prevState: UpdateSlugState,
  formData: FormData,
): Promise<UpdateSlugState> {
  const partner = await requirePartnerAction();
  const raw = String(formData.get("slug") || "");
  const normalized = slugify(raw);
  if (!isValidSlugFormat(normalized)) {
    return { error: "Enter at least 3 letters, numbers, or hyphens.", slug: raw };
  }

  const listing = await getOwnedListing(listingId, partner.id);
  if (!listing) {
    return { error: "Listing not found.", slug: raw };
  }
  if (normalized === listing.slug) {
    return { success: true, slug: normalized };
  }

  const existing = await db.partnerListing.findUnique({ where: { slug: normalized }, select: { id: true } });
  if (existing) {
    return { error: "That URL is already taken — try a different one.", slug: raw };
  }

  await db.partnerListing.update({ where: { id: listing.id }, data: { slug: normalized } });
  revalidatePath(`/business/listings/${listingId}`);
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
// anyone's review time. `listingId` comes from the caller (see
// handleSubmitForReview in partner-listing-form.tsx), same
// bound-and-ownership-checked treatment as saveDirectoryListing.
export async function submitDirectoryListingForReview(
  listingId: string,
  _prevState: SubmitListingState,
  formData: FormData,
): Promise<SubmitListingState> {
  const partner = await requirePartnerAction();

  const values = extractListingFormValues(formData);
  if (!values.companyName.trim()) {
    return { error: "Add a company name before submitting.", field: "companyName" };
  }
  if (values.services.length === 0) {
    return { error: "List at least one service before submitting.", field: "services" };
  }

  const result = await saveListingFields(partner, listingId, formData, {
    status: "PENDING_REVIEW",
    submittedAt: new Date(),
  });
  if (!result.ok) return { error: result.error, field: result.field };

  revalidatePath("/business");
  revalidatePath("/business/listings");
  revalidatePath(`/business/listings/${listingId}`);
  revalidatePath("/system/settings/directory");
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
  revalidatePath("/business");
  revalidatePath("/business/directory-leads");
  revalidatePath(`/business/directory-leads/${lead.id}`);
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
  revalidatePath("/business");
  revalidatePath(`/business/directory-leads/${lead.id}`);
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

  revalidatePath(`/business/directory-leads/${lead.id}`);
  if (!result.sent) return { error: `Saved, but the email didn't send: ${result.error}` };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Admin side
// ---------------------------------------------------------------------------

export async function approveDirectoryListing(id: string): Promise<void> {
  await requireAdminAction();
  const listing = await db.partnerListing.findUniqueOrThrow({
    where: { id },
    include: { categories: { include: { category: true } } },
  });
  await db.partnerListing.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      reviewedAt: new Date(),
      reviewNote: null,
      publishedSnapshot: buildPublishedSnapshot(
        listing,
        listing.categories.map((entry) => entry.category.name),
      ),
    },
  });
  revalidatePath("/system/settings/directory");
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
  revalidatePath("/system/settings/directory");
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
  revalidatePath("/system/settings/directory");
  revalidatePath("/directory");
  revalidatePath(`/directory/${listing.slug}`);
}

import { db } from "@/lib/db";
import type { Industry, PartnerListing, Prisma } from "@/generated/prisma/client";
import { operatingHoursFromJson, type OperatingHours } from "@/lib/operating-hours";
import type { DirectoryLocale } from "@/lib/directory-i18n";

// Re-exported for existing server-side imports (actions, pages) that
// already pull these from "@/lib/directory" — but a "use client" component
// needing DAYS_OF_WEEK/OperatingHours etc. at runtime (not just as a type)
// must import them from "@/lib/operating-hours" directly, never from here:
// this module's own top-level `db` import can't be bundled for the browser.
export {
  DAYS_OF_WEEK,
  formatOpeningHoursSchema,
  groupOperatingHours,
  isValidTimeString,
  operatingHoursFromJson,
  type DayGroup,
  type DayHours,
  type DayOfWeek,
  type OperatingHours,
} from "@/lib/operating-hours";

// The only shape the public directory ever reads — a snapshot of a
// listing's public fields as they were the last time an admin approved
// them (see PartnerListing.publishedSnapshot in schema.prisma). Nothing a
// partner is still editing, and nothing that's never been approved, is ever
// visible here. Deliberately excludes the partner's own User.email/phone —
// a visitor only ever reaches a partner through the lead form.
export type PublishedListingSnapshot = {
  companyName: string;
  tagline: string | null;
  description: string | null;
  services: ServiceEntry[];
  industry: Industry | null;
  website: string | null;
  location: string | null;
  address: string | null;
  operatingHours: OperatingHours | null;
  faqs: FaqEntry[];
  categories: string[];
  translations: ListingTranslations;
  logoUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

// A listing's service/product catalog — see ServicesEditor. `description`
// and `price` are both freeform and optional (price is text, not a number:
// "RM 500", "From RM 200", "Contact for quote" are all legitimate) — only
// `title` is required for an entry to count at all.
export type ServiceEntry = { title: string; description: string; price: string };

// Capped well above what any real listing needs, just to keep a determined
// partner from ballooning the stored JSON and the page it renders into.
const MAX_SERVICES = 20;
const MAX_SERVICE_TITLE_LENGTH = 80;
const MAX_SERVICE_DESCRIPTION_LENGTH = 300;
const MAX_SERVICE_PRICE_LENGTH = 40;

function sanitizeServiceEntry(entry: unknown): ServiceEntry | null {
  // A bare string is an older listing's pre-restructure data (services
  // used to be just string[]) — upgraded in place into a title-only entry
  // rather than requiring a one-off migration, since the conversion is
  // lossless either way.
  if (typeof entry === "string") {
    const title = entry.trim().slice(0, MAX_SERVICE_TITLE_LENGTH);
    return title ? { title, description: "", price: "" } : null;
  }
  if (!entry || typeof entry !== "object") return null;
  const raw = entry as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, MAX_SERVICE_TITLE_LENGTH) : "";
  if (!title) return null;
  return {
    title,
    description: typeof raw.description === "string" ? raw.description.trim().slice(0, MAX_SERVICE_DESCRIPTION_LENGTH) : "",
    price: typeof raw.price === "string" ? raw.price.trim().slice(0, MAX_SERVICE_PRICE_LENGTH) : "",
  };
}

export function servicesFromJson(value: unknown): ServiceEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(sanitizeServiceEntry)
    .filter((entry): entry is ServiceEntry => entry !== null)
    .slice(0, MAX_SERVICES);
}

// Parses the editor's serialized JSON (see ServicesEditor's hidden input)
// permissively — malformed JSON or a non-array becomes an empty list
// rather than a save error, same spirit as parseOperatingHoursFormData.
export function parseServicesJson(raw: string): ServiceEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  return servicesFromJson(parsed);
}

// A listing's FAQ entries — see FaqEditor. Shown on the detail page and
// emitted as FAQPage JSON-LD (see buildFaqJsonLd in
// src/app/directory/[slug]/page.tsx), which is a straightforward, high-value
// win for both SEO (rich snippets) and GEO (an AI answer engine can quote a
// clearly-marked question/answer pair directly).
export type FaqEntry = { question: string; answer: string };

const MAX_FAQS = 20;
const MAX_FAQ_QUESTION_LENGTH = 150;
const MAX_FAQ_ANSWER_LENGTH = 500;

function sanitizeFaqEntry(entry: unknown): FaqEntry | null {
  if (!entry || typeof entry !== "object") return null;
  const raw = entry as Record<string, unknown>;
  const question = typeof raw.question === "string" ? raw.question.trim().slice(0, MAX_FAQ_QUESTION_LENGTH) : "";
  const answer = typeof raw.answer === "string" ? raw.answer.trim().slice(0, MAX_FAQ_ANSWER_LENGTH) : "";
  if (!question || !answer) return null;
  return { question, answer };
}

export function faqsFromJson(value: unknown): FaqEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(sanitizeFaqEntry)
    .filter((entry): entry is FaqEntry => entry !== null)
    .slice(0, MAX_FAQS);
}

// Parses the editor's serialized JSON (see FaqEditor's hidden input)
// permissively, same spirit as parseServicesJson.
export function parseFaqsJson(raw: string): FaqEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  return faqsFromJson(parsed);
}

// AI-translated (or hand-edited) copies of tagline/description for the
// directory's non-English locales — see translateListingContent in
// src/app/actions/directory.ts. Keyed by DirectoryLocale minus "en": the
// English fields are the primary tagline/description themselves, never
// duplicated in here.
export type ListingTranslations = Partial<Record<Exclude<DirectoryLocale, "en">, { tagline: string; description: string }>>;

const TRANSLATION_LOCALES: Exclude<DirectoryLocale, "en">[] = ["zh", "ms"];
const MAX_TRANSLATED_TAGLINE_LENGTH = 140;

function sanitizeTranslationEntry(entry: unknown): { tagline: string; description: string } | null {
  if (!entry || typeof entry !== "object") return null;
  const raw = entry as Record<string, unknown>;
  const tagline = typeof raw.tagline === "string" ? raw.tagline.trim().slice(0, MAX_TRANSLATED_TAGLINE_LENGTH) : "";
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  if (!tagline && !description) return null;
  return { tagline, description };
}

export function translationsFromJson(value: unknown): ListingTranslations {
  if (!value || typeof value !== "object") return {};
  const raw = value as Record<string, unknown>;
  const result: ListingTranslations = {};
  for (const locale of TRANSLATION_LOCALES) {
    const entry = sanitizeTranslationEntry(raw[locale]);
    if (entry) result[locale] = entry;
  }
  return result;
}

// Parses the translation editor's serialized JSON permissively, same spirit
// as parseServicesJson/parseFaqsJson.
export function parseTranslationsJson(raw: string): ListingTranslations {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  return translationsFromJson(parsed);
}

// The inverse of buildPublishedSnapshot — reads the stored JSON back into a
// typed snapshot, tolerating a missing/malformed value (never trust a JSON
// column's shape at the type level) by treating it as "not published".
export function readPublishedSnapshot(value: unknown): PublishedListingSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.companyName !== "string") return null;
  return {
    companyName: raw.companyName,
    tagline: typeof raw.tagline === "string" ? raw.tagline : null,
    description: typeof raw.description === "string" ? raw.description : null,
    services: servicesFromJson(raw.services),
    industry: typeof raw.industry === "string" ? (raw.industry as Industry) : null,
    website: typeof raw.website === "string" ? raw.website : null,
    location: typeof raw.location === "string" ? raw.location : null,
    address: typeof raw.address === "string" ? raw.address : null,
    operatingHours: operatingHoursFromJson(raw.operatingHours),
    faqs: faqsFromJson(raw.faqs),
    categories: Array.isArray(raw.categories) ? raw.categories.filter((entry): entry is string => typeof entry === "string") : [],
    translations: translationsFromJson(raw.translations),
    logoUrl: typeof raw.logoUrl === "string" ? raw.logoUrl : null,
    seoTitle: typeof raw.seoTitle === "string" ? raw.seoTitle : null,
    seoDescription: typeof raw.seoDescription === "string" ? raw.seoDescription : null,
  };
}

// categoryNames comes from a separate query (see approveDirectoryListing) —
// `listing` alone, a bare PartnerListing row, has no relation data to
// resolve PartnerListingCategory rows into names itself.
export function buildPublishedSnapshot(listing: PartnerListing, categoryNames: string[]): PublishedListingSnapshot {
  return {
    companyName: listing.companyName,
    tagline: listing.tagline,
    description: listing.description,
    services: servicesFromJson(listing.services),
    industry: listing.industry,
    website: listing.website,
    location: listing.location,
    address: listing.address,
    operatingHours: operatingHoursFromJson(listing.operatingHours),
    faqs: faqsFromJson(listing.faqs),
    categories: categoryNames,
    translations: translationsFromJson(listing.translations),
    logoUrl: listing.logoUrl,
    seoTitle: listing.seoTitle,
    seoDescription: listing.seoDescription,
  };
}

// A "Visit website" link needs a real absolute URL, not just a bare domain
// — contrast Company.domain (src/lib/companies.ts), which deliberately
// strips down to the bare form for internal matching. A partner typing
// "acme.com" with no scheme still needs to link somewhere that isn't
// resolved relative to this app's own origin.
export function normalizeWebsiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 60;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Exported so both generateListingSlug below and a partner's own slug edit
// (see updateListingSlug in src/app/actions/directory.ts) normalize the
// same way — typing "My Company!!" becomes "my-company" either way, rather
// than rejecting it and making the partner figure out valid syntax by hand.
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining accents so "Jose" -> "jose"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH);
}

export function isValidSlugFormat(value: string): boolean {
  return value.length >= MIN_SLUG_LENGTH && value.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(value);
}

// Generated once, from whatever the partner is called at the time (their
// User.name — companyName isn't set yet on a brand-new draft) — same
// reasoning as referralCode in src/lib/referrals.ts for why it exists at
// all. Unlike a referral code, a partner CAN move it later (see
// updateListingSlug) — this is only ever the starting point. Falls back to
// "partner" for a name with no latinizable characters at all (e.g. fully
// CJK), then disambiguates with a short suffix either way.
export async function generateListingSlug(name: string): Promise<string> {
  const base = slugify(name) || "partner";
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const existing = await db.partnerListing.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique listing slug — please try again.");
}

// A partner account can list more than one business (see
// src/app/business/(dashboard)/listings) — every listing row belongs to
// exactly one partner, but a partner can own several. Ordered oldest-first
// so a partner's listings stay in a stable, predictable order across visits
// rather than reshuffling as they're edited (updatedAt would do that).
export async function listPartnerListings(partnerId: string): Promise<PartnerListing[]> {
  return db.partnerListing.findMany({ where: { partnerId }, orderBy: { createdAt: "asc" } });
}

// Ownership-scoped lookup for a single listing — every partner-facing read
// or write on a specific listing goes through this (or the equivalent
// inline findFirst) rather than a bare findUnique({where:{id}}), since an
// id alone doesn't prove the requesting partner is the one who owns it.
export async function getOwnedListing(listingId: string, partnerId: string): Promise<PartnerListing | null> {
  return db.partnerListing.findFirst({ where: { id: listingId, partnerId } });
}

// Explicit creation — unlike the old single-listing ensurePartnerListing
// (which silently created one the first time any listing page was visited),
// a partner who can have several listings needs "create another one" to be
// a visible, deliberate action (the "+ New listing" button on
// /business/listings), not something that happens as a side effect of
// loading a page.
export async function createPartnerListing(partnerId: string, partnerName: string): Promise<PartnerListing> {
  const slug = await generateListingSlug(partnerName);
  return db.partnerListing.create({
    data: { partnerId, slug, companyName: partnerName, services: [] },
  });
}

export type DirectoryLeadStats = {
  total: number;
  new: number;
  open: number;
  won: number;
  lost: number;
  wonValue: number;
};

async function computeDirectoryLeadStats(where: Prisma.DirectoryLeadWhereInput): Promise<DirectoryLeadStats> {
  const [total, byStatus, wonAgg] = await Promise.all([
    db.directoryLead.count({ where }),
    db.directoryLead.groupBy({ by: ["status"], where, _count: { _all: true } }),
    db.directoryLead.aggregate({ where: { ...where, status: "WON" }, _sum: { value: true } }),
  ]);
  const counts = new Map<string, number>(byStatus.map((row) => [row.status, row._count._all]));
  const won = counts.get("WON") ?? 0;
  const lost = counts.get("LOST") ?? 0;
  return {
    total,
    new: counts.get("NEW") ?? 0,
    open: total - won - lost,
    won,
    lost,
    wonValue: Number(wonAgg._sum.value ?? 0),
  };
}

export async function getDirectoryLeadStats(listingId: string): Promise<DirectoryLeadStats> {
  return computeDirectoryLeadStats({ listingId });
}

// Same shape, summed across every listing a partner owns — for the
// business dashboard's aggregate "Directory listing" card, which no longer
// has one single listing to point getDirectoryLeadStats at.
export async function getDirectoryLeadStatsForPartner(partnerId: string): Promise<DirectoryLeadStats> {
  return computeDirectoryLeadStats({ listing: { partnerId } });
}

export type DirectoryOverviewStats = {
  publishedListings: number;
  pendingListings: number;
  totalLeads: number;
  leadsLast30Days: number;
  wonValue: number;
};

// For Settings → Directory (admin) — across every partner's listing, not
// scoped to one.
export async function getDirectoryOverviewStats(): Promise<DirectoryOverviewStats> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [publishedListings, pendingListings, totalLeads, leadsLast30Days, wonAgg] = await Promise.all([
    db.partnerListing.count({ where: { status: "PUBLISHED" } }),
    db.partnerListing.count({ where: { status: "PENDING_REVIEW" } }),
    db.directoryLead.count(),
    db.directoryLead.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    db.directoryLead.aggregate({ where: { status: "WON" }, _sum: { value: true } }),
  ]);

  return {
    publishedListings,
    pendingListings,
    totalLeads,
    leadsLast30Days,
    wonValue: Number(wonAgg._sum.value ?? 0),
  };
}

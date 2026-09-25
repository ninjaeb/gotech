import { db } from "@/lib/db";
import type { Industry, PartnerListing, Prisma } from "@/generated/prisma/client";
import { operatingHoursFromJson, type OperatingHours } from "@/lib/operating-hours";
import { slugify } from "@/lib/slug";
import { directoryListingPath, type DirectoryLocale } from "@/lib/directory-i18n";
import { organizationJsonLdId, serializeJsonLd, websiteJsonLdId } from "@/lib/directory-seo";

// Re-exported for existing server-side imports (actions, pages) that
// already pull these from "@/lib/directory" — but a "use client" component
// needing DAYS_OF_WEEK/OperatingHours/slugify etc. at runtime (not just as
// a type) must import them from "@/lib/operating-hours"/"@/lib/slug"
// directly, never from here: this module's own top-level `db` import can't
// be bundled for the browser.
export {
  currentDayInTimezone,
  DAYS_OF_WEEK,
  formatOpeningHoursSchema,
  groupOperatingHours,
  isOpenNow,
  isValidTimeString,
  operatingHoursFromJson,
  type DayGroup,
  type DayHours,
  type DayOfWeek,
  type OperatingHours,
} from "@/lib/operating-hours";
export { isValidSlugFormat, slugify } from "@/lib/slug";

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
  address: string | null;
  state: string | null;
  country: string | null;
  operatingHours: OperatingHours | null;
  // The partner ACCOUNT's own timezone (User.timezone) as of publish time —
  // not per-listing; see buildPublishedSnapshot's partnerTimezone parameter.
  timezone: string | null;
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
// src/lib/directory-seo.ts), which is a straightforward, high-value
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

// AI-translated (or hand-edited) copies of tagline/description/services/
// faqs for the directory's non-English locales — see translateListingContent
// in src/app/actions/directory.ts. Keyed by DirectoryLocale minus "en": the
// English fields are the primary tagline/description/services/faqs
// themselves, never duplicated in here. A translated service keeps the
// same price as its English counterpart (price isn't language-specific) —
// see handleTranslate in partner-listing-form.tsx, which re-attaches it by
// index right after the AI call returns.
export type ListingTranslations = Partial<
  Record<Exclude<DirectoryLocale, "en">, { tagline: string; description: string; services: ServiceEntry[]; faqs: FaqEntry[] }>
>;

const TRANSLATION_LOCALES: Exclude<DirectoryLocale, "en">[] = ["zh", "ms"];
const MAX_TRANSLATED_TAGLINE_LENGTH = 140;

function sanitizeTranslationEntry(
  entry: unknown,
): { tagline: string; description: string; services: ServiceEntry[]; faqs: FaqEntry[] } | null {
  if (!entry || typeof entry !== "object") return null;
  const raw = entry as Record<string, unknown>;
  const tagline = typeof raw.tagline === "string" ? raw.tagline.trim().slice(0, MAX_TRANSLATED_TAGLINE_LENGTH) : "";
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  const services = servicesFromJson(raw.services);
  const faqs = faqsFromJson(raw.faqs);
  if (!tagline && !description && services.length === 0 && faqs.length === 0) return null;
  return { tagline, description, services, faqs };
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
    address: typeof raw.address === "string" ? raw.address : null,
    state: typeof raw.state === "string" ? raw.state : null,
    country: typeof raw.country === "string" ? raw.country : null,
    operatingHours: operatingHoursFromJson(raw.operatingHours),
    timezone: typeof raw.timezone === "string" ? raw.timezone : null,
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
// resolve PartnerListingCategory rows into names itself. partnerTimezone is
// the owning User's own timezone (see publishListing in
// src/app/actions/directory.ts) — timezone is an account-level setting now
// (User.timezone, editable from the Profile page), not a PartnerListing
// column, so it has to be passed in rather than read off `listing` itself.
export function buildPublishedSnapshot(
  listing: PartnerListing,
  categoryNames: string[],
  partnerTimezone: string | null,
): PublishedListingSnapshot {
  return {
    companyName: listing.companyName,
    tagline: listing.tagline,
    description: listing.description,
    services: servicesFromJson(listing.services),
    industry: listing.industry,
    website: listing.website,
    address: listing.address,
    state: listing.state,
    country: listing.country,
    operatingHours: operatingHoursFromJson(listing.operatingHours),
    timezone: partnerTimezone,
    faqs: faqsFromJson(listing.faqs),
    categories: categoryNames,
    translations: translationsFromJson(listing.translations),
    logoUrl: listing.logoUrl,
    seoTitle: listing.seoTitle,
    seoDescription: listing.seoDescription,
  };
}

// Only what the directory grid (the home page and each category page)
// actually renders and filters on, in the visitor's own language. This is
// what crosses the wire to the client-side search (see DirectorySearch), so
// it deliberately drops everything the grid never shows — the full About
// text, hours, FAQ, every other language's translation — and, above all,
// the stored logo: that's a data: URL of the whole image (see photoDataUrl),
// which inlined into the HTML and again into React's payload made the home
// page ~870KB for five listings. logoUrl here is a real, cacheable path
// instead (see listingLogoPath).
export type DirectoryGridListing = {
  slug: string;
  companyName: string;
  tagline: string | null;
  services: { title: string; description: string }[];
  industry: Industry | null;
  categories: string[];
  state: string | null;
  country: string | null;
  logoUrl: string | null;
};

export type PublishedListingRow = {
  slug: string;
  publishedAt: Date | null;
  updatedAt: Date;
  listing: PublishedListingSnapshot;
};

// Every listing the public directory shows, newest first — the one query
// behind the home page, the category pages, sitemap.xml, and llms.txt, so
// they can never disagree about what's public. Presence of an approved
// snapshot is the test (same as the detail page), not the row's status.
export async function loadPublishedListings(): Promise<PublishedListingRow[]> {
  const rows = await db.partnerListing.findMany({
    select: { slug: true, publishedAt: true, updatedAt: true, publishedSnapshot: true },
    orderBy: { publishedAt: "desc" },
  });
  return rows.flatMap((row) => {
    const listing = readPublishedSnapshot(row.publishedSnapshot);
    return listing ? [{ slug: row.slug, publishedAt: row.publishedAt, updatedAt: row.updatedAt, listing }] : [];
  });
}

// The logo's real URL (served by /api/directory-images/logo/[slug]). The
// publish timestamp rides along as a cache-buster: the slug outlives any
// number of logo replacements, but every replacement is re-approved, which
// stamps a new publishedAt — so this URL changes exactly when the image
// can, and that route caches the versioned form for good.
export function listingLogoPath(slug: string, publishedAt: Date | null): string {
  const path = `/api/directory-images/logo/${encodeURIComponent(slug)}`;
  return publishedAt ? `${path}?v=${publishedAt.getTime()}` : path;
}

export function toDirectoryGridListing({ slug, publishedAt, listing }: PublishedListingRow, locale: DirectoryLocale): DirectoryGridListing {
  // Same fallback rule as the detail page: a translation only stands in
  // for the field it actually covers; the company name is never translated.
  const translation = locale === "en" ? undefined : listing.translations[locale];
  const services = translation?.services.length ? translation.services : listing.services;
  return {
    slug,
    companyName: listing.companyName,
    tagline: translation?.tagline || listing.tagline,
    services: services.map(({ title, description }) => ({ title, description })),
    industry: listing.industry,
    categories: listing.categories,
    state: listing.state,
    country: listing.country,
    logoUrl: listing.logoUrl ? listingLogoPath(slug, publishedAt) : null,
  };
}

// How many published listings carry each category name — what decides
// which categories get a real link on the home page, a sitemap entry, and
// an llms.txt line (see those callers), versus only a dropdown option.
export function countListingsByCategory(rows: { listing: Pick<PublishedListingSnapshot, "categories"> }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { listing } of rows) {
    for (const category of new Set(listing.categories)) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  return counts;
}

// Other published listings sharing a category, for the detail page's "More
// businesses in [category]" section — the only place on a listing page a
// visitor (or a crawler) could otherwise reach another listing without
// going all the way back to search. Newest-first, same order
// loadPublishedListings already returns; the caller caps how many to show.
export function relatedListingsByCategory(
  rows: PublishedListingRow[],
  category: string,
  excludeSlug: string,
  limit: number,
): PublishedListingRow[] {
  return rows.filter((row) => row.slug !== excludeSlug && row.listing.categories.includes(category)).slice(0, limit);
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

// Schema.org CollectionPage/ItemList markup for the directory's own listing
// pages (the home page and each friendly category page) — the collection-
// level counterpart to a single listing's own LocalBusiness markup (see
// buildJsonLd in src/app/[locale]/business/[slug]/page.tsx). Read by both
// search engines (SEO) and AI answer engines that crawl the page (GEO), same
// reasoning as that one. Each entry is a LocalBusiness in its own right —
// name, this language's canonical URL, logo, region, one-line description —
// rather than a bare name+url pair, so a crawler that never follows through
// to the detail page still learns what each business is and where. The page
// also declares its language and the WebSite/Organization it belongs to
// (see directory-seo.ts), so per-page and site-level markup read as one
// graph rather than unrelated islands.
export function buildDirectoryCollectionJsonLd(
  listings: DirectoryGridListing[],
  url: string,
  siteOrigin: string,
  name: string,
  locale: DirectoryLocale,
  description?: string,
): string {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url,
    inLanguage: locale,
    isPartOf: { "@id": websiteJsonLdId(siteOrigin) },
    publisher: { "@id": organizationJsonLdId(siteOrigin) },
  };
  if (description) jsonLd.description = description;
  jsonLd.mainEntity = {
    "@type": "ItemList",
    numberOfItems: listings.length,
    itemListElement: listings.map((listing, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "LocalBusiness",
        name: listing.companyName,
        url: `${siteOrigin}${directoryListingPath(locale, listing.slug)}`,
        ...(listing.tagline ? { description: listing.tagline } : {}),
        ...(listing.logoUrl ? { image: `${siteOrigin}${listing.logoUrl}` } : {}),
        ...(listing.state || listing.country
          ? {
              address: {
                "@type": "PostalAddress",
                ...(listing.state ? { addressRegion: listing.state } : {}),
                ...(listing.country ? { addressCountry: listing.country } : {}),
              },
            }
          : {}),
      },
    })),
  };
  return serializeJsonLd(jsonLd);
}

// Schema.org BreadcrumbList markup — shared by the category page (Home >
// Category) and a single listing's own page (Home > Category > Business
// name, when the listing has a category). Search engines use this for the
// breadcrumb trail shown under a result instead of the raw URL; an AI
// answer engine crawling the page gets the same "where does this sit in the
// site" context for free. `items` is root-first, and its last entry is the
// current page itself — schema.org expects `item` on every entry, current
// page included, not just the ancestors.
export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
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

// A BusinessCategory row only ever stores an English name (see
// prisma/migrations/20260909170000_seed_business_categories) — there's no
// separate slug column, so a friendly category URL (see
// src/app/directory/category) matches by slugifying that name at request
// time rather than a stored value that could drift out of sync with it.
export async function findCategoryBySlug(categorySlug: string): Promise<string | null> {
  const categories = await db.businessCategory.findMany({ select: { name: true } });
  return categories.find((row) => slugify(row.name) === categorySlug)?.name ?? null;
}

// A partner account can list more than one business (see
// src/app/business-portal/(dashboard)/listings) — every listing row belongs to
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

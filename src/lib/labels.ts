import {
  ActivityType,
  BillingFrequency,
  EnrollmentStatus,
  Industry,
  InvoiceStatus,
  LeadSource,
  LifecycleStage,
  ProductServiceType,
  ProjectStatus,
  QuoteStatus,
  TaskPriority,
  TaskType,
} from "@/generated/prisma/client";

// Stage names are now per-pipeline data, not a fixed enum, so there's no
// static label map — a badge's color comes from its isWon/isLost flags (won
// and lost always read as emerald/rose, matching every existing WON/LOST
// convention in this app) and a small rotating palette for stages in
// between, so an arbitrary-length pipeline still reads as visually varied
// without per-stage color configuration.
const MID_STAGE_BADGE_PALETTE = [
  "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30",
  "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-500/30",
  "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-500/30",
  "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:ring-fuchsia-500/30",
];
const WON_BADGE_CLASSES =
  "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30";
const LOST_BADGE_CLASSES =
  "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-500/30";

export function stageBadgeClasses(stage: { isWon: boolean; isLost: boolean; sortOrder: number }) {
  if (stage.isWon) return WON_BADGE_CLASSES;
  if (stage.isLost) return LOST_BADGE_CLASSES;
  return MID_STAGE_BADGE_PALETTE[stage.sortOrder % MID_STAGE_BADGE_PALETTE.length];
}

export const TASK_TYPES: TaskType[] = [
  "CALL",
  "EMAIL",
  "MEETING",
  "FOLLOW_UP",
  "MILESTONE",
  "OTHER",
];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  FOLLOW_UP: "Follow-up",
  MILESTONE: "Milestone",
  OTHER: "Other",
};

// Deliberately avoids emerald/amber/rose — TASK_PRIORITY_BADGE_CLASSES
// already owns those, and a type badge always renders directly next to a
// priority badge on the same row, so reusing one of those three would make
// two adjacent pills look like duplicates (e.g. a Medium-priority Meeting
// showing "amber, amber" side by side).
export const TASK_TYPE_BADGE_CLASSES: Record<TaskType, string> = {
  CALL: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-500/30",
  EMAIL: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-500/30",
  MEETING: "bg-cyan-50 text-cyan-700 ring-cyan-600/20 dark:bg-cyan-950 dark:text-cyan-300 dark:ring-cyan-500/30",
  FOLLOW_UP:
    "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-500/30",
  MILESTONE:
    "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:ring-fuchsia-500/30",
  OTHER: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30",
};

// Declared low-to-high to match the schema enum's ordinal order, so
// `orderBy: { priority: "desc" }` (HIGH first) lines up with this list.
export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const TASK_PRIORITY_BADGE_CLASSES: Record<TaskPriority, string> = {
  LOW: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
  MEDIUM:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  HIGH: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-500/30",
};

export const LEAD_SOURCES: LeadSource[] = [
  "WEBSITE",
  "REFERRAL",
  "COLD_CALL",
  "SOCIAL_MEDIA",
  "ADVERTISEMENT",
  "EVENT",
  "PARTNER",
  "OTHER",
];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  WEBSITE: "Website",
  REFERRAL: "Referral",
  COLD_CALL: "Cold call",
  SOCIAL_MEDIA: "Social media",
  ADVERTISEMENT: "Advertisement",
  EVENT: "Event",
  PARTNER: "Partner",
  OTHER: "Other",
};

// Roughly ordered low-to-high commitment, left to right — mirrors HubSpot's
// default lifecycle stage set. Kept nullable on the Contact itself (see
// schema); this list is just the set of values a contact can be *set* to.
export const LIFECYCLE_STAGES: LifecycleStage[] = [
  "SUBSCRIBER",
  "LEAD",
  "MQL",
  "SQL",
  "OPPORTUNITY",
  "CUSTOMER",
  "EVANGELIST",
  "OTHER",
];

export const LIFECYCLE_STAGE_LABELS: Record<LifecycleStage, string> = {
  SUBSCRIBER: "Subscriber",
  LEAD: "Lead",
  MQL: "Marketing qualified lead",
  SQL: "Sales qualified lead",
  OPPORTUNITY: "Opportunity",
  CUSTOMER: "Customer",
  EVANGELIST: "Evangelist",
  OTHER: "Other",
};

export const LIFECYCLE_STAGE_BADGE_CLASSES: Record<LifecycleStage, string> = {
  SUBSCRIBER: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30",
  LEAD: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-500/30",
  MQL: "bg-cyan-50 text-cyan-700 ring-cyan-600/20 dark:bg-cyan-950 dark:text-cyan-300 dark:ring-cyan-500/30",
  SQL: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  OPPORTUNITY:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-500/30",
  CUSTOMER:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
  EVANGELIST:
    "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:ring-fuchsia-500/30",
  OTHER: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30",
};

export const INDUSTRIES: Industry[] = [
  "TECHNOLOGY",
  "RETAIL_ECOMMERCE",
  "HEALTHCARE",
  "FINANCE_BANKING",
  "MANUFACTURING",
  "CONSTRUCTION_REAL_ESTATE",
  "EDUCATION",
  "HOSPITALITY_TOURISM",
  "PROFESSIONAL_SERVICES",
  "MEDIA_ENTERTAINMENT",
  "TRANSPORTATION_LOGISTICS",
  "AGRICULTURE",
  "ENERGY_UTILITIES",
  "GOVERNMENT_NONPROFIT",
  "TELECOMMUNICATIONS",
  "AUTOMOTIVE",
  "FOOD_BEVERAGE",
  "LEGAL",
  "MARKETING_ADVERTISING",
  "OTHER",
];

export const INDUSTRY_LABELS: Record<Industry, string> = {
  TECHNOLOGY: "Technology",
  RETAIL_ECOMMERCE: "Retail & E-commerce",
  HEALTHCARE: "Healthcare",
  FINANCE_BANKING: "Finance & Banking",
  MANUFACTURING: "Manufacturing",
  CONSTRUCTION_REAL_ESTATE: "Construction & Real Estate",
  EDUCATION: "Education",
  HOSPITALITY_TOURISM: "Hospitality & Tourism",
  PROFESSIONAL_SERVICES: "Professional Services",
  MEDIA_ENTERTAINMENT: "Media & Entertainment",
  TRANSPORTATION_LOGISTICS: "Transportation & Logistics",
  AGRICULTURE: "Agriculture",
  ENERGY_UTILITIES: "Energy & Utilities",
  GOVERNMENT_NONPROFIT: "Government & Nonprofit",
  TELECOMMUNICATIONS: "Telecommunications",
  AUTOMOTIVE: "Automotive",
  FOOD_BEVERAGE: "Food & Beverage",
  LEGAL: "Legal",
  MARKETING_ADVERTISING: "Marketing & Advertising",
  OTHER: "Other",
};

// Common free-text spellings/synonyms mapped onto the curated Industry enum,
// for matching an arbitrary CSV "Industry" column on import. Best-effort —
// anything that doesn't match stays unclassified (null) rather than
// guessing, same reasoning as leaving the field nullable in the first place.
const INDUSTRY_ALIASES: Record<Industry, string[]> = {
  TECHNOLOGY: ["technology", "tech", "it", "software", "saas", "information technology"],
  RETAIL_ECOMMERCE: ["retail", "ecommerce", "e-commerce", "shop", "store", "commerce"],
  HEALTHCARE: ["healthcare", "health", "medical", "hospital", "clinic", "pharma", "pharmaceutical"],
  FINANCE_BANKING: ["finance", "banking", "bank", "financial services", "insurance", "fintech"],
  MANUFACTURING: ["manufacturing", "factory", "industrial", "production"],
  CONSTRUCTION_REAL_ESTATE: ["construction", "real estate", "realty", "property", "properties"],
  EDUCATION: ["education", "school", "university", "college", "academic", "e-learning", "elearning"],
  HOSPITALITY_TOURISM: ["hospitality", "tourism", "hotel", "travel", "resort"],
  PROFESSIONAL_SERVICES: ["professional services", "consulting", "consultancy", "services"],
  MEDIA_ENTERTAINMENT: ["media", "entertainment", "film", "music", "publishing", "broadcasting"],
  TRANSPORTATION_LOGISTICS: ["transportation", "logistics", "shipping", "freight", "transport", "delivery"],
  AGRICULTURE: ["agriculture", "farming", "agri", "agribusiness"],
  ENERGY_UTILITIES: ["energy", "utilities", "utility", "power", "oil and gas", "oil & gas"],
  GOVERNMENT_NONPROFIT: ["government", "nonprofit", "non-profit", "ngo", "public sector", "charity"],
  TELECOMMUNICATIONS: ["telecommunications", "telecom", "telco"],
  AUTOMOTIVE: ["automotive", "auto", "car", "vehicle", "cars"],
  FOOD_BEVERAGE: ["food", "beverage", "f&b", "restaurant", "catering"],
  LEGAL: ["legal", "law", "law firm", "attorney"],
  MARKETING_ADVERTISING: ["marketing", "advertising", "ads", "agency", "pr", "public relations"],
  OTHER: ["other", "misc", "miscellaneous"],
};

export function matchIndustry(rawValue: string): Industry | null {
  const normalized = rawValue.trim().toLowerCase().replace(/[&/]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  for (const industry of INDUSTRIES) {
    if (INDUSTRY_ALIASES[industry].some((alias) => alias === normalized)) return industry;
  }
  for (const industry of INDUSTRIES) {
    if (INDUSTRY_ALIASES[industry].some((alias) => normalized.includes(alias))) return industry;
  }
  return null;
}

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  NOTE: "Note",
  CALL: "Call",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  MEETING: "Meeting",
  STAGE_CHANGE: "Stage change",
  TASK_COMPLETED: "Task completed",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
};

export const QUOTE_STATUS_BADGE_CLASSES: Record<QuoteStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30",
  SENT: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-500/30",
  VIEWED:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  ACCEPTED:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
  DECLINED: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-500/30",
};

export const PRODUCT_SERVICE_TYPES: ProductServiceType[] = ["PRODUCT", "SERVICE"];

export const PRODUCT_SERVICE_TYPE_LABELS: Record<ProductServiceType, string> = {
  PRODUCT: "Product",
  SERVICE: "Service",
};

export const PRODUCT_SERVICE_TYPE_BADGE_CLASSES: Record<ProductServiceType, string> = {
  PRODUCT: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-500/30",
  SERVICE: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-500/30",
};

export const BILLING_FREQUENCIES: BillingFrequency[] = ["ONE_TIME", "MONTHLY", "QUARTERLY", "YEARLY"];

export const BILLING_FREQUENCY_LABELS: Record<BillingFrequency, string> = {
  ONE_TIME: "One-time",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

export const PROJECT_STATUSES: ProjectStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
};

export const PROJECT_STATUS_BADGE_CLASSES: Record<ProjectStatus, string> = {
  NOT_STARTED:
    "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30",
  IN_PROGRESS:
    "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-500/30",
  ON_HOLD:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  COMPLETED:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
};

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "DRAFT",
  "DEPOSIT_SENT",
  "PROGRESS_BILLED",
  "PAID_IN_FULL",
];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  DEPOSIT_SENT: "Deposit sent",
  PROGRESS_BILLED: "Progress billed",
  PAID_IN_FULL: "Paid in full",
};

export const INVOICE_STATUS_BADGE_CLASSES: Record<InvoiceStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30",
  DEPOSIT_SENT: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-500/30",
  PROGRESS_BILLED:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  PAID_IN_FULL:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
};

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  STOPPED_REPLY: "Stopped — replied",
  STOPPED_MANUAL: "Stopped",
  FAILED: "Failed",
};

export const ENROLLMENT_STATUS_BADGE_CLASSES: Record<EnrollmentStatus, string> = {
  ACTIVE: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-500/30",
  COMPLETED:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
  STOPPED_REPLY:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
  STOPPED_MANUAL:
    "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-500/30",
};

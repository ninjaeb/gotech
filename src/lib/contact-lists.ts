import type { Prisma } from "@/generated/prisma/client";

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export type DynamicListTemplateKey =
  | "no_activity_30d"
  | "leads_not_contacted"
  | "customers_without_active_deal"
  | "unclassified"
  | "no_company";

// v1 dynamic lists aren't a generic query builder — just this handful of
// hand-picked templates, each a plain Prisma where clause. filterDefinition
// on ContactList stores { template: <key> }, not an arbitrary filter, so
// this is the only place new segments get added.
export const DYNAMIC_LIST_TEMPLATES: Record<
  DynamicListTemplateKey,
  { label: string; description: string; where: () => Prisma.ContactWhereInput }
> = {
  no_activity_30d: {
    label: "No activity in 30 days",
    description: "No note, call, email, WhatsApp message, or meeting logged in the last 30 days.",
    where: () => ({ activities: { none: { createdAt: { gte: daysAgo(30) } } } }),
  },
  leads_not_contacted: {
    label: "Leads not yet contacted",
    description: "Lifecycle stage is Lead and no activity has ever been logged.",
    where: () => ({ lifecycleStage: "LEAD", activities: { none: {} } }),
  },
  customers_without_active_deal: {
    label: "Customers without an active deal",
    description: "Lifecycle stage is Customer with no deal currently open (not yet won or lost).",
    where: () => ({
      lifecycleStage: "CUSTOMER",
      deals: { none: { pipelineStage: { isWon: false, isLost: false } } },
    }),
  },
  unclassified: {
    label: "Unclassified contacts",
    description: "No lifecycle stage set yet.",
    where: () => ({ lifecycleStage: null }),
  },
  no_company: {
    label: "Contacts without a company",
    description: "Not linked to any company.",
    where: () => ({ companyId: null }),
  },
};

export function isDynamicListTemplateKey(value: unknown): value is DynamicListTemplateKey {
  return typeof value === "string" && value in DYNAMIC_LIST_TEMPLATES;
}

// filterDefinition is a loosely-typed Json column — this is the one place
// that trusts its shape, and it fails safe (null) on anything unexpected.
export function readTemplateKey(filterDefinition: unknown): DynamicListTemplateKey | null {
  if (!filterDefinition || typeof filterDefinition !== "object") return null;
  const template = (filterDefinition as { template?: unknown }).template;
  return isDynamicListTemplateKey(template) ? template : null;
}

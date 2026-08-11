import { db } from "@/lib/db";
import { formatCurrency, formatDate, fullName } from "@/lib/format";
import { getCurrency } from "@/lib/settings";
import {
  ACTIVITY_TYPE_LABELS,
  DEAL_STAGE_LABELS,
  TASK_TYPE_LABELS,
} from "@/lib/labels";

export type EntityRef =
  | { contactId: string }
  | { companyId: string }
  | { dealId: string };

type EntityContext = { label: string; contextText: string };

function tasksSection(
  tasks: { title: string; type: keyof typeof TASK_TYPE_LABELS; dueDate: Date | null }[],
) {
  if (tasks.length === 0) return ["", "Open tasks: (none)"];
  const lines = ["", "Open tasks:"];
  for (const task of tasks) {
    const due = task.dueDate ? ` (due ${formatDate(task.dueDate)})` : "";
    lines.push(`- [${TASK_TYPE_LABELS[task.type]}] ${task.title}${due}`);
  }
  return lines;
}

function activitySection(
  activities: { type: keyof typeof ACTIVITY_TYPE_LABELS; content: string; createdAt: Date }[],
) {
  if (activities.length === 0) return ["", "Recent activity: (none logged yet)"];
  const lines = ["", "Recent activity (most recent first):"];
  for (const activity of activities) {
    lines.push(
      `- [${formatDate(activity.createdAt)}] ${ACTIVITY_TYPE_LABELS[activity.type]}: ${activity.content}`,
    );
  }
  return lines;
}

async function buildContactContext(contactId: string): Promise<EntityContext | null> {
  const currency = await getCurrency();
  const contact = await db.contact.findUnique({
    where: { id: contactId },
    include: {
      company: true,
      deals: { orderBy: { createdAt: "desc" }, take: 5 },
      tasks: { where: { completed: false }, orderBy: { dueDate: "asc" }, take: 10 },
      activities: { orderBy: { createdAt: "desc" }, take: 15 },
    },
  });
  if (!contact) return null;

  const lines: string[] = [];
  lines.push(
    `Contact: ${fullName(contact.firstName, contact.lastName)}${contact.title ? `, ${contact.title}` : ""}${contact.company ? ` at ${contact.company.name}` : ""}`,
  );
  if (contact.email) lines.push(`Email: ${contact.email}`);
  if (contact.phone) lines.push(`Phone: ${contact.phone}`);
  lines.push(`Notes: ${contact.notes?.trim() || "(none)"}`);
  if (contact.deals.length > 0) {
    lines.push("", "Deals:");
    for (const deal of contact.deals) {
      lines.push(
        `- ${deal.title} — ${DEAL_STAGE_LABELS[deal.stage]}, ${formatCurrency(deal.value.toString(), currency)}`,
      );
    }
  }
  lines.push(...tasksSection(contact.tasks));
  lines.push(...activitySection(contact.activities));

  return { label: fullName(contact.firstName, contact.lastName), contextText: lines.join("\n") };
}

async function buildCompanyContext(companyId: string): Promise<EntityContext | null> {
  const currency = await getCurrency();
  const company = await db.company.findUnique({
    where: { id: companyId },
    include: {
      contacts: { take: 10 },
      deals: { orderBy: { createdAt: "desc" }, take: 10 },
      tasks: { where: { completed: false }, orderBy: { dueDate: "asc" }, take: 10 },
      activities: { orderBy: { createdAt: "desc" }, take: 15 },
    },
  });
  if (!company) return null;

  const lines: string[] = [];
  lines.push(`Company: ${company.name}${company.industry ? ` (${company.industry})` : ""}`);
  lines.push(`Notes: ${company.notes?.trim() || "(none)"}`);
  lines.push(
    `Contacts: ${company.contacts.length > 0 ? company.contacts.map((c) => fullName(c.firstName, c.lastName)).join(", ") : "(none)"}`,
  );
  if (company.deals.length > 0) {
    lines.push("", "Deals:");
    for (const deal of company.deals) {
      lines.push(
        `- ${deal.title} — ${DEAL_STAGE_LABELS[deal.stage]}, ${formatCurrency(deal.value.toString(), currency)}`,
      );
    }
  }
  lines.push(...tasksSection(company.tasks));
  lines.push(...activitySection(company.activities));

  return { label: company.name, contextText: lines.join("\n") };
}

async function buildDealContext(dealId: string): Promise<EntityContext | null> {
  const currency = await getCurrency();
  const deal = await db.deal.findUnique({
    where: { id: dealId },
    include: {
      company: true,
      contact: true,
      tasks: { where: { completed: false }, orderBy: { dueDate: "asc" }, take: 10 },
      activities: { orderBy: { createdAt: "desc" }, take: 15 },
    },
  });
  if (!deal) return null;

  const lines: string[] = [];
  lines.push(`Deal: ${deal.title}`);
  lines.push(`Stage: ${DEAL_STAGE_LABELS[deal.stage]} | Value: ${formatCurrency(deal.value.toString(), currency)}`);
  if (deal.expectedCloseDate) lines.push(`Expected close: ${formatDate(deal.expectedCloseDate)}`);
  if (deal.company) lines.push(`Company: ${deal.company.name}`);
  if (deal.contact) lines.push(`Contact: ${fullName(deal.contact.firstName, deal.contact.lastName)}`);
  lines.push(`Notes: ${deal.notes?.trim() || "(none)"}`);
  lines.push(...tasksSection(deal.tasks));
  lines.push(...activitySection(deal.activities));

  return { label: deal.title, contextText: lines.join("\n") };
}

export async function buildEntityContext(ref: EntityRef): Promise<EntityContext | null> {
  if ("contactId" in ref) return buildContactContext(ref.contactId);
  if ("companyId" in ref) return buildCompanyContext(ref.companyId);
  return buildDealContext(ref.dealId);
}

export async function buildPipelineContext(): Promise<string> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [currency, openDeals, overdueTasks, dueTodayTasks] = await Promise.all([
    getCurrency(),
    db.deal.findMany({
      where: { stage: { notIn: ["WON", "LOST"] } },
      orderBy: { value: "desc" },
      include: { company: true, contact: true },
    }),
    db.task.findMany({
      where: { completed: false, dueDate: { lt: startOfToday } },
      orderBy: { dueDate: "asc" },
      take: 10,
      include: { contact: true, company: true, deal: true },
    }),
    db.task.count({
      where: { completed: false, dueDate: { gte: startOfToday } },
    }),
  ]);

  const lines: string[] = [];
  const totalValue = openDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
  lines.push(`Open pipeline: ${openDeals.length} deals worth ${formatCurrency(totalValue, currency)}.`);

  if (openDeals.length > 0) {
    lines.push("", "Open deals (largest first):");
    for (const deal of openDeals.slice(0, 20)) {
      const who = deal.company?.name ?? (deal.contact ? fullName(deal.contact.firstName, deal.contact.lastName) : "no company");
      lines.push(
        `- ${deal.title} (${who}) — ${DEAL_STAGE_LABELS[deal.stage]}, ${formatCurrency(deal.value.toString(), currency)}${deal.expectedCloseDate ? `, expected close ${formatDate(deal.expectedCloseDate)}` : ""}`,
      );
    }
  }

  lines.push("", `Tasks due later today or already scheduled for today: ${dueTodayTasks}.`);

  if (overdueTasks.length > 0) {
    lines.push("", "Overdue tasks:");
    for (const task of overdueTasks) {
      const who =
        task.deal?.title ?? task.company?.name ?? (task.contact ? fullName(task.contact.firstName, task.contact.lastName) : null);
      lines.push(
        `- ${task.title}${who ? ` (${who})` : ""} — was due ${formatDate(task.dueDate)}`,
      );
    }
  } else {
    lines.push("", "Overdue tasks: none.");
  }

  return lines.join("\n");
}

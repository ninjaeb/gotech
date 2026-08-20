import type { Company, Contact, Deal, Project, Task } from "@/generated/prisma/client";
import { formatDate } from "@/lib/format";

export type DigestTask = Task & {
  contact: Pick<Contact, "firstName" | "lastName"> | null;
  company: Pick<Company, "name"> | null;
  deal: Pick<Deal, "title"> | null;
  project: Pick<Project, "name"> | null;
};

function describeParent(task: DigestTask): string | null {
  if (task.deal) return `Deal: ${task.deal.title}`;
  if (task.project) return `Project: ${task.project.name}`;
  if (task.contact) {
    const name = [task.contact.firstName, task.contact.lastName].filter(Boolean).join(" ");
    return name ? `Contact: ${name}` : null;
  }
  if (task.company) return `Company: ${task.company.name}`;
  return null;
}

function describeTask(task: DigestTask): string {
  const parent = describeParent(task);
  return `  - ${task.title}${parent ? ` (${parent})` : ""}`;
}

// Plain text on purpose — this goes out over whatever SMTP server the
// recipient connected, so it should render fine everywhere without relying
// on an HTML renderer. No links back into the CRM either: building one
// would need a site-URL env var this app otherwise has no reason to
// require, for every deployment, just for this.
export function buildDigestText(tasks: DigestTask[], startOfToday: Date): string {
  const overdue = tasks.filter((task) => task.dueDate && task.dueDate < startOfToday);
  const dueToday = tasks.filter((task) => task.dueDate && task.dueDate >= startOfToday);

  const sections: string[] = [];
  if (overdue.length > 0) {
    sections.push(`Overdue (${overdue.length}):\n${overdue.map(describeTask).join("\n")}`);
  }
  if (dueToday.length > 0) {
    sections.push(`Due today (${dueToday.length}):\n${dueToday.map(describeTask).join("\n")}`);
  }

  return [
    `You have ${tasks.length} task${tasks.length === 1 ? "" : "s"} that ${tasks.length === 1 ? "needs" : "need"} attention as of ${formatDate(startOfToday)}.`,
    "",
    ...sections,
    "",
    "This is your daily task digest from GoTech CRM.",
  ].join("\n");
}

export function buildDigestSubject(tasks: DigestTask[]): string {
  return `${tasks.length} task${tasks.length === 1 ? "" : "s"} due today or overdue`;
}

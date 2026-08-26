"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { fullName } from "@/lib/format";

const RESULT_LIMIT = 5;
const MIN_QUERY_LENGTH = 2;

export type SearchResultItem = { id: string; label: string; sublabel?: string };

export type SearchResults = {
  companies: SearchResultItem[];
  contacts: SearchResultItem[];
  deals: SearchResultItem[];
  tasks: SearchResultItem[];
  projects: SearchResultItem[];
};

const EMPTY_RESULTS: SearchResults = { companies: [], contacts: [], deals: [], tasks: [], projects: [] };

// Companies/Contacts/Deals are Admin-only areas (see requireAdmin) — a
// Developer's search stays scoped to what they can otherwise see (Tasks,
// Projects), rather than surfacing matches they'd be bounced from clicking.
export async function globalSearch(rawQuery: string): Promise<SearchResults> {
  const user = await getCurrentUser();
  const query = rawQuery.trim();
  if (query.length < MIN_QUERY_LENGTH) return EMPTY_RESULTS;
  const isAdmin = user.role === "ADMIN";

  const [companies, contacts, deals, tasks, projects] = await Promise.all([
    isAdmin
      ? db.company.findMany({
          where: { OR: [{ name: { contains: query } }, { domain: { contains: query } }] },
          take: RESULT_LIMIT,
          orderBy: { name: "asc" },
          select: { id: true, name: true, domain: true },
        })
      : [],
    isAdmin
      ? db.contact.findMany({
          where: {
            OR: [
              { firstName: { contains: query } },
              { lastName: { contains: query } },
              { email: { contains: query } },
            ],
          },
          take: RESULT_LIMIT,
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [],
    isAdmin
      ? db.deal.findMany({
          where: { title: { contains: query } },
          take: RESULT_LIMIT,
          orderBy: { updatedAt: "desc" },
          select: { id: true, title: true, company: { select: { name: true } } },
        })
      : [],
    db.task.findMany({
      where: { title: { contains: query } },
      take: RESULT_LIMIT,
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    }),
    db.project.findMany({
      where: { name: { contains: query } },
      take: RESULT_LIMIT,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    companies: companies.map((c) => ({ id: c.id, label: c.name, sublabel: c.domain ?? undefined })),
    contacts: contacts.map((c) => ({
      id: c.id,
      label: fullName(c.firstName, c.lastName),
      sublabel: c.email ?? undefined,
    })),
    deals: deals.map((d) => ({ id: d.id, label: d.title, sublabel: d.company?.name })),
    tasks: tasks.map((t) => ({ id: t.id, label: t.title })),
    projects: projects.map((p) => ({ id: p.id, label: p.name })),
  };
}

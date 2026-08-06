import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { initials } from "@/lib/format";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  const contacts = await db.contact.findMany({
    where: query
      ? {
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { email: { contains: query } },
          ],
        }
      : undefined,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    include: { company: true },
  });

  return (
    <div>
      <PageHeader
        title="Contacts"
        description={`${contacts.length} ${contacts.length === 1 ? "contact" : "contacts"}`}
        actions={
          <Link href="/contacts/new" className={buttonClasses()}>
            <Plus className="h-4 w-4" />
            New contact
          </Link>
        }
      />

      <form className="mb-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search contacts…"
            className="pl-9"
          />
        </div>
      </form>

      {contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? "No contacts match your search" : "No contacts yet"}
          description={
            query
              ? "Try a different search term."
              : "Add your first contact to start building relationships."
          }
          action={
            !query && (
              <Link href="/contacts/new" className={buttonClasses()}>
                <Plus className="h-4 w-4" />
                New contact
              </Link>
            )
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <Link
                  href={`/contacts/${contact.id}`}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-neutral-800/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {initials(`${contact.firstName} ${contact.lastName}`)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {contact.firstName} {contact.lastName}
                    </p>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                      {[contact.title, contact.company?.name]
                        .filter(Boolean)
                        .join(" at ") ||
                        contact.email ||
                        "—"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

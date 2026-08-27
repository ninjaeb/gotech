"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContactAvatar } from "@/components/contacts/contact-avatar";
import { LifecycleStageFilterSelect } from "@/components/contacts/lifecycle-stage-filter-select";
import { fullName } from "@/lib/format";
import { LIFECYCLE_STAGE_BADGE_CLASSES, LIFECYCLE_STAGE_LABELS } from "@/lib/labels";
import type { LifecycleStage } from "@/generated/prisma/client";

type ContactRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  title: string | null;
  photoUrl: string | null;
  lifecycleStage: LifecycleStage | null;
  company: { name: string } | null;
};

export function ContactSearchList({ contacts, stage }: { contacts: ContactRow[]; stage?: string }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((contact) => {
      const name = fullName(contact.firstName, contact.lastName).toLowerCase();
      return (
        name.includes(q) ||
        !!contact.email?.toLowerCase().includes(q) ||
        !!contact.company?.name.toLowerCase().includes(q)
      );
    });
  }, [contacts, query]);

  const hasActiveFilters = query.trim().length > 0 || !!stage;

  return (
    <div>
      <form className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search contacts…"
            className="pl-9"
          />
        </div>
        <LifecycleStageFilterSelect defaultValue={stage} />
      </form>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasActiveFilters ? "No contacts match your filters" : "No contacts yet"}
          description={
            hasActiveFilters
              ? "Try a different search term or stage."
              : "Add your first contact to start building relationships."
          }
          action={
            !hasActiveFilters && (
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
            {filtered.map((contact) => (
              <li key={contact.id}>
                <Link
                  href={`/contacts/${contact.id}`}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-neutral-800/50"
                >
                  <ContactAvatar
                    photoUrl={contact.photoUrl}
                    name={fullName(contact.firstName, contact.lastName)}
                    className="h-9 w-9 text-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {fullName(contact.firstName, contact.lastName)}
                    </p>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                      {[contact.title, contact.company?.name]
                        .filter(Boolean)
                        .join(" at ") ||
                        contact.email ||
                        "—"}
                    </p>
                  </div>
                  {contact.lifecycleStage && (
                    <Badge className={`shrink-0 ${LIFECYCLE_STAGE_BADGE_CLASSES[contact.lifecycleStage]}`}>
                      {LIFECYCLE_STAGE_LABELS[contact.lifecycleStage]}
                    </Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

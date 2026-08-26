import Link from "next/link";
import { Plus, Search, Upload, Users } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContactAvatar } from "@/components/contacts/contact-avatar";
import { LifecycleStageFilterSelect } from "@/components/contacts/lifecycle-stage-filter-select";
import { fullName } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/dal";
import { LIFECYCLE_STAGES, LIFECYCLE_STAGE_BADGE_CLASSES, LIFECYCLE_STAGE_LABELS } from "@/lib/labels";
import type { LifecycleStage, Prisma } from "@/generated/prisma/client";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string }>;
}) {
  await requireAdmin();
  const { q, stage: rawStage } = await searchParams;
  const query = q?.trim();
  const stage = rawStage?.trim();
  const isValidStage = (value?: string): value is LifecycleStage =>
    !!value && LIFECYCLE_STAGES.includes(value as LifecycleStage);

  const where: Prisma.ContactWhereInput = {
    ...(query
      ? {
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { email: { contains: query } },
          ],
        }
      : {}),
    ...(stage === "unset"
      ? { lifecycleStage: null }
      : isValidStage(stage)
        ? { lifecycleStage: stage }
        : {}),
  };

  const contacts = await db.contact.findMany({
    where,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    include: { company: true },
  });

  return (
    <div>
      <PageHeader
        title="Contacts"
        description={`${contacts.length} ${contacts.length === 1 ? "contact" : "contacts"}`}
        actions={
          <>
            <Link href="/contacts/import" className={buttonClasses("secondary")}>
              <Upload className="h-4 w-4" />
              Import
            </Link>
            <Link href="/contacts/new" className={buttonClasses()}>
              <Plus className="h-4 w-4" />
              New contact
            </Link>
          </>
        }
      />

      <form className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search contacts…"
            className="pl-9"
          />
        </div>
        <LifecycleStageFilterSelect defaultValue={stage} />
      </form>

      {contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query || stage ? "No contacts match your filters" : "No contacts yet"}
          description={
            query || stage
              ? "Try a different search term or stage."
              : "Add your first contact to start building relationships."
          }
          action={
            !query &&
            !stage && (
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

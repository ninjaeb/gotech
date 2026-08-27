import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import { ContactSearchList } from "@/components/contacts/contact-search-list";
import { requireAdmin } from "@/lib/auth/dal";
import { LIFECYCLE_STAGES } from "@/lib/labels";
import type { LifecycleStage, Prisma } from "@/generated/prisma/client";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  await requireAdmin();
  const { stage: rawStage } = await searchParams;
  const stage = rawStage?.trim();
  const isValidStage = (value?: string): value is LifecycleStage =>
    !!value && LIFECYCLE_STAGES.includes(value as LifecycleStage);

  const where: Prisma.ContactWhereInput =
    stage === "unset" ? { lifecycleStage: null } : isValidStage(stage) ? { lifecycleStage: stage } : {};

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

      <ContactSearchList contacts={contacts} stage={stage} />
    </div>
  );
}

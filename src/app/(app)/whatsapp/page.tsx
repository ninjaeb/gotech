import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ContactAvatar } from "@/components/contacts/contact-avatar";
import { fullName, relativeToToday } from "@/lib/format";
import { parseWhatsAppActivityContent } from "@/lib/whatsapp";

export default async function WhatsAppInboxPage() {
  await requireAdmin();

  // orderBy before distinct is what makes this "the latest Activity per
  // contact" rather than an arbitrary row per contact — Prisma applies
  // distinct to the already-sorted result set.
  const latest = await db.activity.findMany({
    where: { type: "WHATSAPP", contactId: { not: null } },
    orderBy: { createdAt: "desc" },
    distinct: ["contactId"],
    select: {
      id: true,
      content: true,
      createdAt: true,
      contact: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
    },
  });

  const conversations = latest.flatMap((activity) => (activity.contact ? [{ ...activity, contact: activity.contact }] : []));

  return (
    <div>
      <PageHeader
        title="WhatsApp"
        description={`${conversations.length} ${conversations.length === 1 ? "conversation" : "conversations"}`}
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No WhatsApp conversations yet"
          description="Messages you send or receive through a Contact's page will show up here."
        />
      ) : (
        <Card className="divide-y divide-slate-200 dark:divide-neutral-800">
          {conversations.map(({ id, content, createdAt, contact }) => {
            const name = fullName(contact.firstName, contact.lastName);
            const { direction, text } = parseWhatsAppActivityContent(content);
            return (
              <Link
                key={id}
                href={`/whatsapp/${contact.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-neutral-800/60"
              >
                <ContactAvatar photoUrl={contact.photoUrl} name={name} className="h-10 w-10 text-sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{name}</p>
                    <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                      {relativeToToday(createdAt)}
                    </span>
                  </div>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {direction === "OUTBOUND" && <span className="text-slate-400 dark:text-slate-500">You: </span>}
                    {text}
                  </p>
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}

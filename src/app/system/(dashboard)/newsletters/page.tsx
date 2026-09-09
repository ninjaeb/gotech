import Link from "next/link";
import { Mail, MessageCircle, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { NewsletterStatusBadge } from "@/components/newsletters/newsletter-status-badge";
import { WhatsAppBroadcastStatusBadge } from "@/components/newsletters/whatsapp-broadcast-status-badge";

export default async function NewslettersPage() {
  const [newsletters, whatsAppBroadcasts] = await Promise.all([
    db.newsletter.findMany({
      orderBy: { createdAt: "desc" },
      include: { list: { select: { name: true } }, _count: { select: { recipients: true } } },
    }),
    db.whatsAppBroadcast.findMany({
      orderBy: { createdAt: "desc" },
      include: { list: { select: { name: true } }, _count: { select: { recipients: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Newsletters"
        description="Compose and send bulk updates to a contact list, by email or WhatsApp"
        actions={
          <div className="flex gap-2">
            <Link href="/system/newsletters/whatsapp/new" className={buttonClasses("secondary", "sm")}>
              <Plus className="h-4 w-4" />
              New WhatsApp broadcast
            </Link>
            <Link href="/system/newsletters/new" className={buttonClasses("primary", "sm")}>
              <Plus className="h-4 w-4" />
              New newsletter
            </Link>
          </div>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Email newsletters</CardTitle>
        </CardHeader>
        <CardBody>
          {newsletters.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No newsletters yet."
              description="Create one to send an update to a contact list, now or on a schedule."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {newsletters.map((newsletter) => (
                <li key={newsletter.id}>
                  <Link
                    href={`/system/newsletters/${newsletter.id}`}
                    className="flex items-center justify-between gap-2 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-neutral-800/50"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate font-medium text-slate-800 dark:text-slate-200">
                        {newsletter.subject}
                        <NewsletterStatusBadge status={newsletter.status} />
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {newsletter.list?.name ?? "No audience chosen"}
                        {newsletter._count.recipients > 0 && ` · ${newsletter._count.recipients} recipients`}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp broadcasts</CardTitle>
        </CardHeader>
        <CardBody>
          {whatsAppBroadcasts.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No WhatsApp broadcasts yet."
              description="Send an update to a list's WhatsApp-opted-in contacts via the approved template."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {whatsAppBroadcasts.map((broadcast) => (
                <li key={broadcast.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate font-medium text-slate-800 dark:text-slate-200">
                      {broadcast.headline}
                      <WhatsAppBroadcastStatusBadge status={broadcast.status} />
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {broadcast.list?.name ?? "List deleted"} · {broadcast._count.recipients} recipient
                      {broadcast._count.recipients === 1 ? "" : "s"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

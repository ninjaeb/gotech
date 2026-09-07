import Link from "next/link";
import { Mail, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { NewsletterStatusBadge } from "@/components/newsletters/newsletter-status-badge";

export default async function NewslettersPage() {
  const newsletters = await db.newsletter.findMany({
    orderBy: { createdAt: "desc" },
    include: { list: { select: { name: true } }, _count: { select: { recipients: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Newsletters"
        description="Compose, schedule, and send bulk email to a contact list"
        actions={
          <Link href="/newsletters/new" className={buttonClasses("primary", "sm")}>
            <Plus className="h-4 w-4" />
            New newsletter
          </Link>
        }
      />
      <Card>
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
                    href={`/newsletters/${newsletter.id}`}
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
    </div>
  );
}

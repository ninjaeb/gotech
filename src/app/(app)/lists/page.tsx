import Link from "next/link";
import { ListFilter, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getListContactCount } from "@/lib/contact-list-query";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";

export default async function ListsPage() {
  await requireAdmin();

  const lists = await db.contactList.findMany({ orderBy: { createdAt: "desc" } });
  const counts = await Promise.all(lists.map((list) => getListContactCount(list)));

  return (
    <div>
      <PageHeader
        title="Lists"
        description={`${lists.length} ${lists.length === 1 ? "list" : "lists"}`}
        actions={
          <Link href="/lists/new" className={buttonClasses()}>
            <Plus className="h-4 w-4" />
            New list
          </Link>
        }
      />

      {lists.length === 0 ? (
        <EmptyState
          icon={ListFilter}
          title="No lists yet"
          description="Group contacts into a hand-picked list, or a template-driven segment that updates itself."
          action={
            <Link href="/lists/new" className={buttonClasses()}>
              <Plus className="h-4 w-4" />
              New list
            </Link>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
            {lists.map((list, index) => (
              <li key={list.id}>
                <Link
                  href={`/lists/${list.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-neutral-800/50"
                >
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{list.name}</p>
                  <div className="flex shrink-0 items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span>
                      {counts[index]} {counts[index] === 1 ? "contact" : "contacts"}
                    </span>
                    <Badge
                      className={
                        list.type === "DYNAMIC"
                          ? "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-500/30"
                          : "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30"
                      }
                    >
                      {list.type === "DYNAMIC" ? "Dynamic" : "Static"}
                    </Badge>
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

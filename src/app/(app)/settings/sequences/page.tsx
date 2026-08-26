import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteSequence } from "@/app/actions/sequences";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function SequencesPage() {
  const sequences = await db.sequence.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { steps: true, enrollments: true } } },
  });

  return (
    <div className="max-w-lg">
      <PageHeader
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Sequences" }]}
        title="Sequences"
        description="Multi-step automated email cadences you can enroll a contact into"
        actions={
          <Link href="/settings/sequences/new" className={buttonClasses("primary", "sm")}>
            <Plus className="h-4 w-4" />
            New sequence
          </Link>
        }
      />
      <Card>
        <CardBody>
          {sequences.length === 0 ? (
            <EmptyState
              title="No sequences yet."
              description="Create one to start automating follow-ups over email."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {sequences.map((sequence) => (
                <li key={sequence.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate font-medium text-slate-800 dark:text-slate-200">
                      {sequence.name}
                      {!sequence.active && <Badge>Inactive</Badge>}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {sequence._count.steps} {sequence._count.steps === 1 ? "step" : "steps"} ·{" "}
                      {sequence._count.enrollments} enrolled
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Link
                      href={`/settings/sequences/${sequence.id}`}
                      title="Edit sequence"
                      aria-label="Edit sequence"
                      className={buttonClasses("secondary", "sm")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <form action={deleteSequence.bind(null, sequence.id)}>
                      <ConfirmSubmitButton
                        confirmMessage={`Delete the "${sequence.name}" sequence? Enrolled contacts will stop receiving it.`}
                        size="sm"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </ConfirmSubmitButton>
                    </form>
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { logTime, deleteTimeEntry } from "@/app/actions/time-entries";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { formatDateInput, formatDate, formatMinutes } from "@/lib/format";

export default async function TaskTimePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const task = await db.task.findUnique({
    where: { id },
    include: {
      timeEntries: {
        orderBy: { date: "desc" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  if (!task) notFound();

  const total = task.timeEntries.reduce((sum, entry) => sum + entry.minutes, 0);

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Tasks", href: "/tasks" },
          { label: task.title, href: `/tasks/${task.id}` },
          { label: "Log time" },
        ]}
        title="Log time"
        description={
          <Link href={`/tasks/${task.id}`} className="text-indigo-600 hover:underline">
            {task.title}
          </Link>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Log time</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={logTime.bind(null, task.id)} className="flex flex-wrap items-end gap-2">
            <Input
              name="minutes"
              type="number"
              min={1}
              step={1}
              required
              placeholder="Minutes"
              className="w-28"
            />
            <DatePicker name="date" defaultValue={formatDateInput(new Date())} placeholder="Date" className="w-40" />
            <Input name="note" placeholder="What did you work on? (optional)" className="min-w-[12rem] flex-1" />
            <Button type="submit" size="sm">
              Log time
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entries ({task.timeEntries.length})</CardTitle>
          {total > 0 && (
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {formatMinutes(total)} total
            </span>
          )}
        </CardHeader>
        <CardBody>
          {task.timeEntries.length === 0 ? (
            <EmptyState title="No time logged yet." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {task.timeEntries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="text-slate-800 dark:text-slate-200">
                      <span className="font-medium">{formatMinutes(entry.minutes)}</span>
                      {" · "}
                      {entry.user.name}
                      {" · "}
                      {formatDate(entry.date)}
                    </p>
                    {entry.note && (
                      <p className="mt-0.5 text-slate-500 dark:text-slate-400">{entry.note}</p>
                    )}
                  </div>
                  <form action={deleteTimeEntry.bind(null, task.id, entry.id)}>
                    <ConfirmSubmitButton
                      confirmMessage="Delete this time entry?"
                      variant="ghost"
                      size="sm"
                      className="!px-1.5 text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </ConfirmSubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

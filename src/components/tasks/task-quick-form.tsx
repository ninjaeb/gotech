"use client";

import { useRef, useTransition } from "react";
import { createTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_TYPES, TASK_TYPE_LABELS } from "@/lib/labels";

export function TaskQuickForm({
  contactId,
  companyId,
  dealId,
  projectId,
  users,
  defaultAssigneeId,
}: {
  contactId?: string;
  companyId?: string;
  dealId?: string;
  projectId?: string;
  users: { id: string; name: string }[];
  defaultAssigneeId?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await createTask(formData);
          formRef.current?.reset();
        });
      }}
      className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3 dark:border-neutral-800"
    >
      {contactId && <input type="hidden" name="contactId" value={contactId} />}
      {companyId && <input type="hidden" name="companyId" value={companyId} />}
      {dealId && <input type="hidden" name="dealId" value={dealId} />}
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      <Input
        name="title"
        placeholder="New task…"
        required
        className="min-w-[10rem] flex-1"
      />
      <Select name="type" defaultValue="OTHER" className="w-32">
        {TASK_TYPES.map((type) => (
          <option key={type} value={type}>
            {TASK_TYPE_LABELS[type]}
          </option>
        ))}
      </Select>
      <Select name="priority" defaultValue="MEDIUM" className="w-28">
        {TASK_PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {TASK_PRIORITY_LABELS[priority]}
          </option>
        ))}
      </Select>
      {users.length > 0 && (
        <div className="flex min-w-[11rem] flex-col gap-1 rounded-md px-3 py-2 text-sm ring-1 ring-inset ring-slate-300 dark:bg-neutral-900 dark:ring-neutral-700">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Assignees</span>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {users.map((user) => (
              <label
                key={user.id}
                className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300"
              >
                <input
                  type="checkbox"
                  name="assigneeIds"
                  value={user.id}
                  defaultChecked={user.id === defaultAssigneeId}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-neutral-700"
                />
                {user.name}
              </label>
            ))}
          </div>
        </div>
      )}
      <DatePicker name="dueDate" placeholder="Due date" className="w-40" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add task"}
      </Button>
    </form>
  );
}

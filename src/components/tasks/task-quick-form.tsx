"use client";

import { useRef, useTransition } from "react";
import { createTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { TASK_TYPES, TASK_TYPE_LABELS } from "@/lib/labels";

export function TaskQuickForm({
  contactId,
  companyId,
  dealId,
}: {
  contactId?: string;
  companyId?: string;
  dealId?: string;
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
      <DatePicker name="dueDate" placeholder="Due date" className="w-40" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add task"}
      </Button>
    </form>
  );
}

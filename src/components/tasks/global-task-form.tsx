"use client";

import { useRef, useTransition } from "react";
import { createTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { TASK_TYPES, TASK_TYPE_LABELS } from "@/lib/labels";

export function GlobalTaskForm({
  companies,
  contacts,
  deals,
}: {
  companies: { id: string; name: string }[];
  contacts: { id: string; firstName: string; lastName: string }[];
  deals: { id: string; title: string }[];
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
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <FieldGroup label="Task" htmlFor="g-title" className="sm:col-span-3">
          <Input id="g-title" name="title" required placeholder="Follow up on proposal" />
        </FieldGroup>
      </div>
      <div className="grid gap-3 sm:grid-cols-5">
        <FieldGroup label="Type" htmlFor="g-type">
          <Select id="g-type" name="type" defaultValue="OTHER">
            {TASK_TYPES.map((type) => (
              <option key={type} value={type}>
                {TASK_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup label="Due date" htmlFor="g-dueDate">
          <DatePicker id="g-dueDate" name="dueDate" />
        </FieldGroup>
        <FieldGroup label="Company" htmlFor="g-companyId">
          <Select id="g-companyId" name="companyId" defaultValue="">
            <option value="">—</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup label="Contact" htmlFor="g-contactId">
          <Select id="g-contactId" name="contactId" defaultValue="">
            <option value="">—</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup label="Deal" htmlFor="g-dealId">
          <Select id="g-dealId" name="dealId" defaultValue="">
            <option value="">—</option>
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.title}
              </option>
            ))}
          </Select>
        </FieldGroup>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add task"}
        </Button>
      </div>
    </form>
  );
}

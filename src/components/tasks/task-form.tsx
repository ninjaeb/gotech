"use client";

import { useMemo, useState } from "react";
import type { Task } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { TASK_TYPES, TASK_TYPE_LABELS } from "@/lib/labels";
import { formatDateInput, fullName } from "@/lib/format";

type ContactOption = { id: string; firstName: string; lastName: string | null; companyId: string | null };

export function TaskForm({
  action,
  task,
  companies,
  contacts,
  deals,
  submitLabel = "Save task",
}: {
  action: (formData: FormData) => void;
  task?: Task;
  companies: { id: string; name: string }[];
  contacts: ContactOption[];
  deals: { id: string; title: string }[];
  submitLabel?: string;
}) {
  const [companyId, setCompanyId] = useState(task?.companyId ?? "");
  const [contactId, setContactId] = useState(task?.contactId ?? "");

  const filteredContacts = useMemo(
    () => (companyId ? contacts.filter((contact) => contact.companyId === companyId) : contacts),
    [contacts, companyId],
  );

  function handleCompanyChange(nextCompanyId: string) {
    setCompanyId(nextCompanyId);
    const contactStillValid = !nextCompanyId
      ? true
      : contacts.some((contact) => contact.id === contactId && contact.companyId === nextCompanyId);
    if (!contactStillValid) setContactId("");
  }

  function handleContactChange(nextContactId: string) {
    setContactId(nextContactId);
    const contact = contacts.find((c) => c.id === nextContactId);
    if (contact?.companyId) setCompanyId(contact.companyId);
  }

  return (
    <form action={action} className="space-y-4">
      <FieldGroup label="Task" htmlFor="title" required>
        <Input id="title" name="title" required defaultValue={task?.title} placeholder="Follow up on proposal" />
      </FieldGroup>

      <FieldGroup label="Description" htmlFor="description">
        <Textarea id="description" name="description" rows={3} defaultValue={task?.description ?? ""} />
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Type" htmlFor="type">
          <Select id="type" name="type" defaultValue={task?.type ?? "OTHER"}>
            {TASK_TYPES.map((type) => (
              <option key={type} value={type}>
                {TASK_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup label="Due date" htmlFor="dueDate">
          <DatePicker id="dueDate" name="dueDate" defaultValue={formatDateInput(task?.dueDate)} />
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FieldGroup label="Company" htmlFor="companyId">
          <Select
            id="companyId"
            name="companyId"
            value={companyId}
            onChange={(event) => handleCompanyChange(event.target.value)}
          >
            <option value="">—</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup label="Contact" htmlFor="contactId">
          <Select
            id="contactId"
            name="contactId"
            value={contactId}
            onChange={(event) => handleContactChange(event.target.value)}
          >
            <option value="">—</option>
            {filteredContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {fullName(contact.firstName, contact.lastName)}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup label="Deal" htmlFor="dealId">
          <Select id="dealId" name="dealId" defaultValue={task?.dealId ?? ""}>
            <option value="">—</option>
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.title}
              </option>
            ))}
          </Select>
        </FieldGroup>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

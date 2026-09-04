"use client";

import { useMemo, useState } from "react";
import type { Task } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { AttachmentField } from "@/components/activity/attachment-field";
import { AttachmentPreview, type AttachmentInfo } from "@/components/activity/attachment-preview";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_TYPES, TASK_TYPE_LABELS } from "@/lib/labels";
import { formatDateInput, fullName } from "@/lib/format";

type ContactOption = { id: string; firstName: string; lastName: string | null; companyId: string | null };
type DealOption = { id: string; title: string; companyId: string | null; contactId: string | null };
type UserOption = { id: string; name: string };

function dealMatches(deal: DealOption, companyId: string, contactId: string) {
  if (!companyId && !contactId) return true;
  return (companyId !== "" && deal.companyId === companyId) || (contactId !== "" && deal.contactId === contactId);
}

export function TaskForm({
  action,
  task,
  companies,
  contacts,
  deals,
  users,
  assigneeIds = [],
  followerIds = [],
  existingAttachments = [],
  submitLabel = "Save task",
}: {
  action: (formData: FormData) => void;
  task?: Task;
  companies: { id: string; name: string }[];
  contacts: ContactOption[];
  deals: DealOption[];
  users: UserOption[];
  assigneeIds?: string[];
  followerIds?: string[];
  existingAttachments?: AttachmentInfo[];
  submitLabel?: string;
}) {
  const [companyId, setCompanyId] = useState(task?.companyId ?? "");
  const [contactId, setContactId] = useState(task?.contactId ?? "");
  const [dealId, setDealId] = useState(task?.dealId ?? "");

  const filteredContacts = useMemo(
    () => (companyId ? contacts.filter((contact) => contact.companyId === companyId) : contacts),
    [contacts, companyId],
  );
  const filteredDeals = useMemo(
    () => deals.filter((deal) => dealMatches(deal, companyId, contactId)),
    [deals, companyId, contactId],
  );

  function handleCompanyChange(nextCompanyId: string) {
    setCompanyId(nextCompanyId);
    const contactStillValid = !nextCompanyId
      ? true
      : contacts.some((contact) => contact.id === contactId && contact.companyId === nextCompanyId);
    const nextContactId = contactStillValid ? contactId : "";
    if (!contactStillValid) setContactId("");
    const deal = deals.find((d) => d.id === dealId);
    if (deal && !dealMatches(deal, nextCompanyId, nextContactId)) setDealId("");
  }

  function handleContactChange(nextContactId: string) {
    setContactId(nextContactId);
    const contact = contacts.find((c) => c.id === nextContactId);
    const nextCompanyId = contact?.companyId ?? companyId;
    if (contact?.companyId) setCompanyId(contact.companyId);
    const deal = deals.find((d) => d.id === dealId);
    if (deal && !dealMatches(deal, nextCompanyId, nextContactId)) setDealId("");
  }

  return (
    <form action={action} className="space-y-4">
      <FieldGroup label="Task" htmlFor="title" required>
        <Input id="title" name="title" required defaultValue={task?.title} placeholder="Follow up on proposal" />
      </FieldGroup>

      <FieldGroup label="Description" htmlFor="description">
        <AttachmentField
          id="description"
          name="description"
          rows={3}
          users={users}
          required={false}
          defaultValue={task?.description ?? ""}
          placeholder="@ to mention someone"
        />
        {existingAttachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {existingAttachments.map((attachment) => (
              <AttachmentPreview key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-3">
        <FieldGroup label="Type" htmlFor="type">
          <Select id="type" name="type" defaultValue={task?.type ?? "OTHER"}>
            {TASK_TYPES.map((type) => (
              <option key={type} value={type}>
                {TASK_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup label="Priority" htmlFor="priority">
          <Select id="priority" name="priority" defaultValue={task?.priority ?? "MEDIUM"}>
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {TASK_PRIORITY_LABELS[priority]}
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
          <Select
            id="dealId"
            name="dealId"
            value={dealId}
            onChange={(event) => setDealId(event.target.value)}
          >
            <option value="">—</option>
            {filteredDeals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.title}
              </option>
            ))}
          </Select>
        </FieldGroup>
      </div>

      <FieldGroup label="Assignees" htmlFor="assigneeIds-group">
        {users.length === 0 ? (
          <p className="text-sm text-slate-400">No users to assign this task to.</p>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {users.map((user, index) => (
              <label
                key={user.id}
                htmlFor={`assigneeIds-${index}`}
                className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300"
              >
                <input
                  id={`assigneeIds-${index}`}
                  type="checkbox"
                  name="assigneeIds"
                  value={user.id}
                  defaultChecked={assigneeIds.includes(user.id)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-neutral-700"
                />
                {user.name}
              </label>
            ))}
          </div>
        )}
      </FieldGroup>

      <FieldGroup label="Followers" htmlFor="followerIds-group">
        {users.length === 0 ? (
          <p className="text-sm text-slate-400">No other users to follow this task.</p>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {users.map((user, index) => (
              <label
                key={user.id}
                htmlFor={`followerIds-${index}`}
                className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300"
              >
                <input
                  id={`followerIds-${index}`}
                  type="checkbox"
                  name="followerIds"
                  value={user.id}
                  defaultChecked={followerIds.includes(user.id)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-neutral-700"
                />
                {user.name}
              </label>
            ))}
          </div>
        )}
      </FieldGroup>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { Task } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select } from "@/components/ui/field";
import { Combobox } from "@/components/ui/combobox";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { AttachmentField } from "@/components/activity/attachment-field";
import { AttachmentPreview, type AttachmentInfo } from "@/components/activity/attachment-preview";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_TYPES, TASK_TYPE_LABELS } from "@/lib/labels";
import { formatCurrency, formatDateInput, fullName } from "@/lib/format";

type ContactOption = { id: string; firstName: string; lastName: string | null; companyId: string | null };
type DealOption = { id: string; title: string; value: string; companyId: string | null; contactId: string | null };
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
  currency,
  dealIds = [],
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
  currency: string;
  // A task can belong to any number of deals — see the TaskDeal join table.
  dealIds?: string[];
  assigneeIds?: string[];
  followerIds?: string[];
  existingAttachments?: AttachmentInfo[];
  submitLabel?: string;
}) {
  const [companyId, setCompanyId] = useState(task?.companyId ?? "");
  const [contactId, setContactId] = useState(task?.contactId ?? "");
  const [selectedDealIds, setSelectedDealIds] = useState(dealIds);

  const filteredContacts = useMemo(
    () => (companyId ? contacts.filter((contact) => contact.companyId === companyId) : contacts),
    [contacts, companyId],
  );
  const filteredDeals = useMemo(
    () => deals.filter((deal) => dealMatches(deal, companyId, contactId)),
    [deals, companyId, contactId],
  );
  const dealOptions = useMemo(
    () => deals.map((deal) => ({ value: deal.id, label: deal.title, sublabel: formatCurrency(deal.value, currency) })),
    [deals, currency],
  );

  // Dropping a company/contact that no longer matches a selected deal keeps
  // the deal picker honest — the same pruning the single-select version of
  // this field already did, just applied across every currently-picked deal
  // instead of just one.
  function pruneMismatchedDeals(nextCompanyId: string, nextContactId: string) {
    setSelectedDealIds((current) =>
      current.filter((dealId) => {
        const deal = deals.find((d) => d.id === dealId);
        return !deal || dealMatches(deal, nextCompanyId, nextContactId);
      }),
    );
  }

  function handleCompanyChange(nextCompanyId: string) {
    setCompanyId(nextCompanyId);
    const contactStillValid = !nextCompanyId
      ? true
      : contacts.some((contact) => contact.id === contactId && contact.companyId === nextCompanyId);
    const nextContactId = contactStillValid ? contactId : "";
    if (!contactStillValid) setContactId("");
    pruneMismatchedDeals(nextCompanyId, nextContactId);
  }

  function handleContactChange(nextContactId: string) {
    setContactId(nextContactId);
    const contact = contacts.find((c) => c.id === nextContactId);
    const nextCompanyId = contact?.companyId ?? companyId;
    if (contact?.companyId) setCompanyId(contact.companyId);
    pruneMismatchedDeals(nextCompanyId, nextContactId);
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

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Company" htmlFor="companyId">
          <Combobox
            id="companyId"
            name="companyId"
            value={companyId}
            onValueChange={handleCompanyChange}
            placeholder="—"
            options={[
              { value: "", label: "—" },
              ...companies.map((company) => ({ value: company.id, label: company.name })),
            ]}
          />
        </FieldGroup>
        <FieldGroup label="Contact" htmlFor="contactId">
          <Combobox
            id="contactId"
            name="contactId"
            value={contactId}
            onValueChange={handleContactChange}
            placeholder="—"
            options={[
              { value: "", label: "—" },
              ...filteredContacts.map((contact) => ({
                value: contact.id,
                label: fullName(contact.firstName, contact.lastName),
              })),
            ]}
          />
        </FieldGroup>
      </div>

      <FieldGroup label="Deals" htmlFor="dealIds">
        {deals.length === 0 ? (
          <p className="text-sm text-slate-400">No deals to link this task to.</p>
        ) : (
          <MultiCombobox
            id="dealIds"
            name="dealIds"
            value={selectedDealIds}
            onValueChange={setSelectedDealIds}
            placeholder="Search deals…"
            emptyMessage={companyId || contactId ? "No matching deals for this company/contact" : "No matching deals"}
            options={(companyId || contactId ? filteredDeals : deals).map((deal) => dealOptions.find((o) => o.value === deal.id)!)}
          />
        )}
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Assignees" htmlFor="assigneeIds">
          {users.length === 0 ? (
            <p className="text-sm text-slate-400">No users to assign this task to.</p>
          ) : (
            <MultiCombobox
              id="assigneeIds"
              name="assigneeIds"
              defaultValue={assigneeIds}
              placeholder="Search team members…"
              emptyMessage="No matching team members"
              options={users.map((user) => ({ value: user.id, label: user.name }))}
            />
          )}
        </FieldGroup>

        <FieldGroup label="Followers" htmlFor="followerIds">
          {users.length === 0 ? (
            <p className="text-sm text-slate-400">No other users to follow this task.</p>
          ) : (
            <MultiCombobox
              id="followerIds"
              name="followerIds"
              defaultValue={followerIds}
              placeholder="Search team members…"
              emptyMessage="No matching team members"
              options={users.map((user) => ({ value: user.id, label: user.name }))}
            />
          )}
        </FieldGroup>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

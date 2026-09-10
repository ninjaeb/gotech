"use client";

import { useActionState, useMemo, useState } from "react";
import type { PartnerTask } from "@/generated/prisma/client";
import type { PartnerTaskFormState } from "@/app/actions/partner-tasks";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { formatDateInput, fullName } from "@/lib/format";

type CompanyOption = { id: string; name: string };
type ContactOption = { id: string; firstName: string; lastName: string | null; companyId: string | null };
type DealOption = { id: string; title: string; companyId: string | null; contactId: string | null };

function dealMatches(deal: DealOption, companyId: string, contactId: string) {
  if (!companyId && !contactId) return true;
  return (companyId !== "" && deal.companyId === companyId) || (contactId !== "" && deal.contactId === contactId);
}

export function PartnerTaskForm({
  action,
  task,
  companies,
  contacts,
  deals,
  defaultCompanyId,
  defaultContactId,
  defaultDealId,
  submitLabel = "Save task",
}: {
  action: (prevState: PartnerTaskFormState, formData: FormData) => Promise<PartnerTaskFormState>;
  task?: PartnerTask;
  companies: CompanyOption[];
  contacts: ContactOption[];
  deals: DealOption[];
  defaultCompanyId?: string;
  defaultContactId?: string;
  defaultDealId?: string;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const values = state?.values;
  const [companyId, setCompanyId] = useState(values?.companyId ?? task?.companyId ?? defaultCompanyId ?? "");
  const [contactId, setContactId] = useState(values?.contactId ?? task?.contactId ?? defaultContactId ?? "");
  const [dealId, setDealId] = useState(values?.dealId ?? task?.dealId ?? defaultDealId ?? "");

  const filteredContacts = useMemo(
    () => (companyId ? contacts.filter((contact) => contact.companyId === companyId) : contacts),
    [contacts, companyId],
  );
  const filteredDeals = useMemo(() => deals.filter((deal) => dealMatches(deal, companyId, contactId)), [deals, companyId, contactId]);

  function handleCompanyChange(nextCompanyId: string) {
    setCompanyId(nextCompanyId);
    const contactStillValid = !nextCompanyId ? true : contacts.some((contact) => contact.id === contactId && contact.companyId === nextCompanyId);
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
    <form action={formAction} className="space-y-4">
      <FieldGroup label="Task" htmlFor="title" required>
        <Input id="title" name="title" required defaultValue={values?.title ?? task?.title} placeholder="Follow up on proposal" />
      </FieldGroup>

      <FieldGroup label="Description" htmlFor="description">
        <Textarea id="description" name="description" rows={3} defaultValue={values?.description ?? task?.description ?? ""} placeholder="Any extra detail…" />
      </FieldGroup>

      <FieldGroup label="Due date" htmlFor="dueDate">
        <DatePicker id="dueDate" name="dueDate" defaultValue={values?.dueDate ?? formatDateInput(task?.dueDate)} />
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-3">
        <FieldGroup label="Company" htmlFor="companyId">
          <Combobox
            id="companyId"
            name="companyId"
            value={companyId}
            onValueChange={handleCompanyChange}
            placeholder="—"
            options={[{ value: "", label: "—" }, ...companies.map((company) => ({ value: company.id, label: company.name }))]}
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
              ...filteredContacts.map((contact) => ({ value: contact.id, label: fullName(contact.firstName, contact.lastName) })),
            ]}
          />
        </FieldGroup>
        <FieldGroup label="Deal" htmlFor="dealId">
          <Combobox
            id="dealId"
            name="dealId"
            value={dealId}
            onValueChange={setDealId}
            placeholder="—"
            options={[{ value: "", label: "—" }, ...filteredDeals.map((deal) => ({ value: deal.id, label: deal.title }))]}
          />
        </FieldGroup>
      </div>

      {state?.error && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

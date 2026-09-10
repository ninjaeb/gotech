"use client";

import { useActionState, useMemo, useState } from "react";
import type { PartnerCompany, PartnerContact } from "@/generated/prisma/client";
import type { PartnerDealFormState } from "@/app/actions/partner-deals";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/field";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { formatDateInput, fullName } from "@/lib/format";
import { PARTNER_DEAL_STATUSES, PARTNER_DEAL_STATUS_LABELS } from "@/lib/labels";

type ContactOption = Pick<PartnerContact, "id" | "firstName" | "lastName" | "companyId">;

// Plain-number/plain-object shape, not the Prisma-generated PartnerDeal
// type — that carries `value` as a Decimal, which can't cross the Server
// -> Client Component boundary as a prop (see EditPartnerDealPage, which
// converts it with Number(...) before passing a deal down here).
type PartnerDealDraft = {
  title: string;
  value: number;
  status: string;
  companyId: string | null;
  contactId: string | null;
  expectedCloseDate: Date | null;
  notes: string | null;
};

export function PartnerDealForm({
  action,
  deal,
  companies,
  contacts,
  defaultCompanyId,
  defaultContactId,
  submitLabel = "Save deal",
  currency = "USD",
}: {
  action: (prevState: PartnerDealFormState, formData: FormData) => Promise<PartnerDealFormState>;
  deal?: PartnerDealDraft;
  companies: PartnerCompany[];
  contacts: ContactOption[];
  defaultCompanyId?: string;
  defaultContactId?: string;
  submitLabel?: string;
  currency?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const values = state?.values;
  const [contactId, setContactId] = useState(values?.contactId ?? deal?.contactId ?? defaultContactId ?? "");
  const [companyId, setCompanyId] = useState(() => {
    if (values?.companyId) return values.companyId;
    if (deal?.companyId) return deal.companyId;
    if (defaultCompanyId) return defaultCompanyId;
    return contacts.find((contact) => contact.id === contactId)?.companyId ?? "";
  });

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
    <form action={formAction} className="space-y-4">
      <FieldGroup label="Deal title" htmlFor="title" required>
        <Input id="title" name="title" required defaultValue={values?.title ?? deal?.title} placeholder="Acme Inc. — Website redesign" />
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label={`Value (${currency})`} htmlFor="value">
          <Input
            id="value"
            name="value"
            type="number"
            min={0}
            step="0.01"
            defaultValue={values?.value ?? (deal ? deal.value.toString() : "0")}
          />
        </FieldGroup>
        <FieldGroup label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={values?.status ?? deal?.status ?? "OPEN"}>
            {PARTNER_DEAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PARTNER_DEAL_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Company" htmlFor="companyId">
          <Combobox
            id="companyId"
            name="companyId"
            value={companyId}
            onValueChange={handleCompanyChange}
            placeholder="No company"
            options={[{ value: "", label: "No company" }, ...companies.map((company) => ({ value: company.id, label: company.name }))]}
          />
        </FieldGroup>
        <FieldGroup label="Contact" htmlFor="contactId">
          <Combobox
            id="contactId"
            name="contactId"
            value={contactId}
            onValueChange={handleContactChange}
            placeholder="No contact"
            options={[
              { value: "", label: "No contact" },
              ...filteredContacts.map((contact) => ({ value: contact.id, label: fullName(contact.firstName, contact.lastName) })),
            ]}
          />
        </FieldGroup>
      </div>

      <FieldGroup label="Expected close date" htmlFor="expectedCloseDate">
        <DatePicker id="expectedCloseDate" name="expectedCloseDate" defaultValue={values?.expectedCloseDate ?? formatDateInput(deal?.expectedCloseDate)} />
      </FieldGroup>

      <FieldGroup label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={values?.notes ?? deal?.notes ?? ""}
          placeholder="Anything worth remembering about this deal…"
        />
      </FieldGroup>

      {state?.error && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useMemo, useState } from "react";
import type { Company, Contact, Deal } from "@/generated/prisma/client";
import type { DealFormState } from "@/app/actions/deals";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { DEAL_STAGES, DEAL_STAGE_LABELS } from "@/lib/labels";
import { formatDateInput, fullName } from "@/lib/format";

type ContactOption = Pick<Contact, "id" | "firstName" | "lastName" | "companyId">;

export function DealForm({
  action,
  deal,
  companies,
  contacts,
  defaultCompanyId,
  defaultContactId,
  submitLabel = "Save deal",
  currency = "USD",
}: {
  action: (prevState: DealFormState, formData: FormData) => Promise<DealFormState> | DealFormState;
  // Omit + override value: Deal's own type has value as a Prisma Decimal,
  // which can't cross the Server -> Client Component boundary as a prop
  // (only plain serializable objects can) — see EditDealPage, which converts
  // it with Number(...) before passing a deal down to this component.
  deal?: Omit<Deal, "value"> & { value: number };
  companies: Company[];
  contacts: ContactOption[];
  defaultCompanyId?: string;
  defaultContactId?: string;
  submitLabel?: string;
  currency?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [companyId, setCompanyId] = useState(deal?.companyId ?? defaultCompanyId ?? "");
  const [contactId, setContactId] = useState(deal?.contactId ?? defaultContactId ?? "");

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
        <Input
          id="title"
          name="title"
          required
          defaultValue={deal?.title}
          placeholder="Acme Inc. — Annual contract"
        />
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label={`Value (${currency})`} htmlFor="value">
          <Input
            id="value"
            name="value"
            type="number"
            min={0}
            step="0.01"
            defaultValue={deal ? deal.value.toString() : "0"}
          />
        </FieldGroup>
        <FieldGroup label="Stage" htmlFor="stage">
          <Select id="stage" name="stage" defaultValue={deal?.stage ?? "LEAD"}>
            {DEAL_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {DEAL_STAGE_LABELS[stage]}
              </option>
            ))}
          </Select>
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Company" htmlFor="companyId">
          <Select
            id="companyId"
            name="companyId"
            value={companyId}
            onChange={(event) => handleCompanyChange(event.target.value)}
          >
            <option value="">No company</option>
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
            <option value="">No contact</option>
            {filteredContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {fullName(contact.firstName, contact.lastName)}
              </option>
            ))}
          </Select>
        </FieldGroup>
      </div>

      <FieldGroup label="Expected close date" htmlFor="expectedCloseDate">
        <DatePicker
          id="expectedCloseDate"
          name="expectedCloseDate"
          className="max-w-xs"
          defaultValue={formatDateInput(deal?.expectedCloseDate)}
        />
      </FieldGroup>

      <FieldGroup label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={deal?.notes ?? ""}
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

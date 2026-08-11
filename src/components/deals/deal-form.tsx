import type { Company, Contact, Deal } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/field";
import { DEAL_STAGES, DEAL_STAGE_LABELS } from "@/lib/labels";
import { formatDateInput } from "@/lib/format";

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
  action: (formData: FormData) => void;
  deal?: Deal;
  companies: Company[];
  contacts: Pick<Contact, "id" | "firstName" | "lastName">[];
  defaultCompanyId?: string;
  defaultContactId?: string;
  submitLabel?: string;
  currency?: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <FieldGroup label="Deal title" htmlFor="title">
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
            defaultValue={deal?.companyId ?? defaultCompanyId ?? ""}
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
            defaultValue={deal?.contactId ?? defaultContactId ?? ""}
          >
            <option value="">No contact</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName}
              </option>
            ))}
          </Select>
        </FieldGroup>
      </div>

      <FieldGroup label="Expected close date" htmlFor="expectedCloseDate">
        <Input
          id="expectedCloseDate"
          name="expectedCloseDate"
          type="date"
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

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useMemo, useState } from "react";
import type { Company, Contact } from "@/generated/prisma/client";
import type { DealFormState } from "@/app/actions/deals";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { formatDateInput, fullName } from "@/lib/format";

type ContactOption = Pick<Contact, "id" | "firstName" | "lastName" | "companyId">;
type PipelineOption = { id: string; name: string; stages: { id: string; name: string }[] };
type UserOption = { id: string; name: string };

// Plain-number/plain-object shape, not the Prisma-generated Deal type —
// that carries `value` as a Decimal, which can't cross the Server -> Client
// Component boundary as a prop. See EditDealPage, which converts it with
// Number(...) before passing a deal down to this component.
type DealDraft = {
  title: string;
  value: number;
  pipelineId: string;
  pipelineStageId: string;
  companyId: string | null;
  contactId: string | null;
  ownerId: string | null;
  expectedCloseDate: Date | null;
  notes: string | null;
};

export function DealForm({
  action,
  deal,
  companies,
  contacts,
  pipelines,
  users,
  defaultCompanyId,
  defaultContactId,
  defaultPipelineId,
  defaultOwnerId,
  submitLabel = "Save deal",
  currency = "USD",
}: {
  action: (prevState: DealFormState, formData: FormData) => Promise<DealFormState> | DealFormState;
  deal?: DealDraft;
  companies: Company[];
  contacts: ContactOption[];
  pipelines: PipelineOption[];
  users: UserOption[];
  defaultCompanyId?: string;
  defaultContactId?: string;
  defaultPipelineId?: string;
  defaultOwnerId?: string;
  submitLabel?: string;
  currency?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [contactId, setContactId] = useState(deal?.contactId ?? defaultContactId ?? "");
  // Lazy initializer: when a deal is pre-seeded with a contact but no explicit
  // company (e.g. "Add deal" from a Contact's own page), fall back to that
  // contact's own company — mirrors what handleContactChange already does on
  // manual selection, just applied once at mount too.
  const [companyId, setCompanyId] = useState(() => {
    if (deal?.companyId) return deal.companyId;
    if (defaultCompanyId) return defaultCompanyId;
    return contacts.find((contact) => contact.id === contactId)?.companyId ?? "";
  });

  const [pipelineId, setPipelineId] = useState(
    deal?.pipelineId ?? defaultPipelineId ?? pipelines[0]?.id ?? "",
  );
  const selectedPipeline = useMemo(
    () => pipelines.find((pipeline) => pipeline.id === pipelineId) ?? pipelines[0],
    [pipelines, pipelineId],
  );
  const [pipelineStageId, setPipelineStageId] = useState(
    deal?.pipelineStageId ?? selectedPipeline?.stages[0]?.id ?? "",
  );

  function handlePipelineChange(nextPipelineId: string) {
    setPipelineId(nextPipelineId);
    const nextPipeline = pipelines.find((pipeline) => pipeline.id === nextPipelineId);
    const stageStillValid = nextPipeline?.stages.some((stage) => stage.id === pipelineStageId);
    if (!stageStillValid) setPipelineStageId(nextPipeline?.stages[0]?.id ?? "");
  }

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

      <FieldGroup label="Pipeline" htmlFor="pipelineId">
        <Select
          id="pipelineId"
          name="pipelineId"
          value={pipelineId}
          onChange={(event) => handlePipelineChange(event.target.value)}
        >
          {pipelines.map((pipeline) => (
            <option key={pipeline.id} value={pipeline.id}>
              {pipeline.name}
            </option>
          ))}
        </Select>
      </FieldGroup>

      <FieldGroup label="Owner" htmlFor="ownerId">
        <Select id="ownerId" name="ownerId" defaultValue={deal?.ownerId ?? defaultOwnerId ?? ""}>
          <option value="">Unassigned</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </Select>
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
        <FieldGroup label="Stage" htmlFor="pipelineStageId">
          <Select
            id="pipelineStageId"
            name="pipelineStageId"
            value={pipelineStageId}
            onChange={(event) => setPipelineStageId(event.target.value)}
          >
            {selectedPipeline?.stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
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

"use client";

import { useActionState, useState } from "react";
import type { PartnerContact } from "@/generated/prisma/client";
import type { PartnerContactFormState } from "@/app/actions/partner-contacts";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";
import { Combobox } from "@/components/ui/combobox";
import { PHONE_FORMAT_HINT } from "@/lib/phone";

type CompanyOption = { id: string; name: string };

export function PartnerContactForm({
  action,
  contact,
  companies,
  defaultCompanyId,
  submitLabel = "Save contact",
}: {
  action: (prevState: PartnerContactFormState, formData: FormData) => Promise<PartnerContactFormState>;
  contact?: PartnerContact;
  companies: CompanyOption[];
  defaultCompanyId?: string;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const values = state?.values;
  const [companyId, setCompanyId] = useState(values?.companyId ?? contact?.companyId ?? defaultCompanyId ?? "");

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="First name" htmlFor="firstName" required>
          <Input id="firstName" name="firstName" required defaultValue={values?.firstName ?? contact?.firstName} placeholder="Jane" />
        </FieldGroup>
        <FieldGroup label="Last name" htmlFor="lastName">
          <Input id="lastName" name="lastName" defaultValue={values?.lastName ?? contact?.lastName ?? ""} placeholder="Doe" />
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={values?.email ?? contact?.email ?? ""} placeholder="jane@acme.com" />
        </FieldGroup>
        <FieldGroup label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={values?.phone ?? contact?.phone ?? ""} placeholder="+60 12 345 6789" />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{PHONE_FORMAT_HINT}</p>
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Job title" htmlFor="title">
          <Input id="title" name="title" defaultValue={values?.title ?? contact?.title ?? ""} placeholder="Marketing Manager" />
        </FieldGroup>
        <FieldGroup label="Company" htmlFor="companyId">
          <Combobox
            id="companyId"
            name="companyId"
            value={companyId}
            onValueChange={setCompanyId}
            placeholder="No company"
            options={[{ value: "", label: "No company" }, ...companies.map((company) => ({ value: company.id, label: company.name }))]}
          />
        </FieldGroup>
      </div>

      <FieldGroup label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={values?.notes ?? contact?.notes ?? ""}
          placeholder="Anything worth remembering about this contact…"
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

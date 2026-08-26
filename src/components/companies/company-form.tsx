"use client";

import { useActionState } from "react";
import type { Company } from "@/generated/prisma/client";
import type { CompanyFormState } from "@/app/actions/companies";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/field";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/labels";
import { PHONE_FORMAT_HINT } from "@/lib/phone";

export function CompanyForm({
  action,
  company,
  submitLabel = "Save company",
}: {
  action: (prevState: CompanyFormState, formData: FormData) => Promise<CompanyFormState>;
  company?: Company;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const values = state?.values;

  return (
    <form action={formAction} className="space-y-4">
      <FieldGroup label="Company name" htmlFor="name" required>
        <Input
          id="name"
          name="name"
          required
          defaultValue={values?.name ?? company?.name}
          placeholder="Acme Inc."
        />
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Domain" htmlFor="domain">
          <Input
            id="domain"
            name="domain"
            defaultValue={values?.domain ?? company?.domain ?? ""}
            placeholder="acme.com"
          />
        </FieldGroup>
        <FieldGroup label="Industry" htmlFor="industry">
          <Select id="industry" name="industry" defaultValue={values?.industry ?? company?.industry ?? ""}>
            <option value="">Unclassified</option>
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {INDUSTRY_LABELS[industry]}
              </option>
            ))}
          </Select>
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Phone" htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            defaultValue={values?.phone ?? company?.phone ?? ""}
            placeholder="+60 12 345 6789"
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{PHONE_FORMAT_HINT}</p>
        </FieldGroup>
        <FieldGroup label="Address" htmlFor="address">
          <Input
            id="address"
            name="address"
            defaultValue={values?.address ?? company?.address ?? ""}
            placeholder="123 Main St, City"
          />
        </FieldGroup>
      </div>

      <FieldGroup label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={values?.notes ?? company?.notes ?? ""}
          placeholder="Anything worth remembering about this company…"
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

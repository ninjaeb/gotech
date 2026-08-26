import type { Company } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/field";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/labels";

export function CompanyForm({
  action,
  company,
  submitLabel = "Save company",
}: {
  action: (formData: FormData) => void;
  company?: Company;
  submitLabel?: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <FieldGroup label="Company name" htmlFor="name" required>
        <Input
          id="name"
          name="name"
          required
          defaultValue={company?.name}
          placeholder="Acme Inc."
        />
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Domain" htmlFor="domain">
          <Input
            id="domain"
            name="domain"
            defaultValue={company?.domain ?? ""}
            placeholder="acme.com"
          />
        </FieldGroup>
        <FieldGroup label="Industry" htmlFor="industry">
          <Select id="industry" name="industry" defaultValue={company?.industry ?? ""}>
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
            defaultValue={company?.phone ?? ""}
            placeholder="+1 555 000 0000"
          />
        </FieldGroup>
        <FieldGroup label="Address" htmlFor="address">
          <Input
            id="address"
            name="address"
            defaultValue={company?.address ?? ""}
            placeholder="123 Main St, City"
          />
        </FieldGroup>
      </div>

      <FieldGroup label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={company?.notes ?? ""}
          placeholder="Anything worth remembering about this company…"
        />
      </FieldGroup>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

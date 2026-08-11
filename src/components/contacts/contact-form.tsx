import type { Company, Contact } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/field";

export function ContactForm({
  action,
  contact,
  companies,
  defaultCompanyId,
  submitLabel = "Save contact",
}: {
  action: (formData: FormData) => void;
  contact?: Contact;
  companies: Company[];
  defaultCompanyId?: string;
  submitLabel?: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="First name" htmlFor="firstName" required>
          <Input
            id="firstName"
            name="firstName"
            required
            defaultValue={contact?.firstName}
          />
        </FieldGroup>
        <FieldGroup label="Last name" htmlFor="lastName">
          <Input
            id="lastName"
            name="lastName"
            defaultValue={contact?.lastName ?? ""}
          />
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={contact?.email ?? ""}
            placeholder="jane@acme.com"
          />
        </FieldGroup>
        <FieldGroup label="Phone" htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            defaultValue={contact?.phone ?? ""}
            placeholder="+1 555 000 0000"
          />
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Job title" htmlFor="title">
          <Input
            id="title"
            name="title"
            defaultValue={contact?.title ?? ""}
            placeholder="VP of Sales"
          />
        </FieldGroup>
        <FieldGroup label="Company" htmlFor="companyId">
          <Select
            id="companyId"
            name="companyId"
            defaultValue={contact?.companyId ?? defaultCompanyId ?? ""}
          >
            <option value="">No company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </FieldGroup>
      </div>

      <FieldGroup label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={contact?.notes ?? ""}
          placeholder="Anything worth remembering about this contact…"
        />
      </FieldGroup>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

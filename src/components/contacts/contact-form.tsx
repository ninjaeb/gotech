"use client";

import { useActionState } from "react";
import type { Company, Contact } from "@/generated/prisma/client";
import type { ContactFormState } from "@/app/actions/contacts";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/field";

export function ContactForm({
  action,
  contact,
  companies,
  defaultCompanyId,
  submitLabel = "Save contact",
}: {
  action: (prevState: ContactFormState, formData: FormData) => Promise<ContactFormState>;
  contact?: Contact;
  companies: Company[];
  defaultCompanyId?: string;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
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

      <FieldGroup label="Photo" htmlFor="photo">
        <div className="flex items-center gap-4">
          {contact?.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- data: URL, not an optimizable remote/static asset
            <img
              src={contact.photoUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
          )}
          <div className="flex-1 space-y-2">
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-400 dark:file:bg-neutral-800 dark:file:text-slate-200 dark:hover:file:bg-neutral-700"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              JPEG, PNG, WebP, or GIF, up to 3MB.
            </p>
            {contact?.photoUrl && (
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  name="removePhoto"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Remove current photo
              </label>
            )}
          </div>
        </div>
      </FieldGroup>

      <FieldGroup label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={contact?.notes ?? ""}
          placeholder="Anything worth remembering about this contact…"
        />
      </FieldGroup>

      {state?.error && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

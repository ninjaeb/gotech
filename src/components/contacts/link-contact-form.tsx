"use client";

import { useRef, useTransition } from "react";
import { linkExistingContact } from "@/app/actions/contacts";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { fullName } from "@/lib/format";

type ContactOption = {
  id: string;
  firstName: string;
  lastName: string | null;
  company: { name: string } | null;
};

export function LinkContactForm({
  companyId,
  contacts,
}: {
  companyId: string;
  contacts: ContactOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  if (contacts.length === 0) return null;

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await linkExistingContact(companyId, formData);
          formRef.current?.reset();
        });
      }}
      className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-neutral-800"
    >
      <Select name="contactId" required defaultValue="" className="min-w-[12rem] flex-1">
        <option value="" disabled>
          Link an existing contact…
        </option>
        {contacts.map((contact) => (
          <option key={contact.id} value={contact.id}>
            {fullName(contact.firstName, contact.lastName)}
            {contact.company ? ` — ${contact.company.name}` : ""}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Linking…" : "Link"}
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { createContact } from "@/app/actions/contacts";
import { ContactForm } from "@/components/contacts/contact-form";
import { ContactQuickImport } from "@/components/contacts/contact-quick-import";
import type { CompanyOption } from "@/lib/companies";
import type { ContactDraft } from "@/lib/contact-draft";

export function NewContactForm({
  companies,
  defaultCompanyId,
}: {
  companies: CompanyOption[];
  defaultCompanyId?: string;
}) {
  const [draft, setDraft] = useState<ContactDraft | null>(null);
  // A quick-import can resolve to a company that didn't exist when
  // `companies` was fetched server-side — merge it in locally so the
  // <select> actually has an option for it, rather than silently failing
  // to select a value it has no matching <option> for.
  const [companyList, setCompanyList] = useState(companies);
  // ContactForm's fields are uncontrolled (defaultValue) — bumping this key
  // remounts it with fresh defaults from the new draft, rather than trying
  // to imperatively push values into already-mounted inputs.
  const [version, setVersion] = useState(0);

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-100 pb-4 dark:border-neutral-800">
        <ContactQuickImport
          onImported={(next) => {
            setDraft(next);
            setVersion((v) => v + 1);
            if (next.company && !companyList.some((c) => c.id === next.company!.id)) {
              setCompanyList((prev) => [...prev, next.company!].sort((a, b) => a.name.localeCompare(b.name)));
            }
          }}
        />
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Fills in the fields below from a business card photo or a shared contact file — review before saving.
        </p>
      </div>
      <ContactForm
        key={version}
        action={createContact}
        companies={companyList}
        defaultCompanyId={draft?.company?.id ?? defaultCompanyId}
        prefill={draft ?? undefined}
        submitLabel="Create contact"
      />
    </div>
  );
}

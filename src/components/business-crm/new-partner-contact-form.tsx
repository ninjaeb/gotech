"use client";

import { useState } from "react";
import { createPartnerContact } from "@/app/actions/partner-contacts";
import { scanPartnerBusinessCard } from "@/app/actions/scan-partner-business-card";
import { importPartnerVCard } from "@/app/actions/import-partner-vcard";
import { PartnerContactForm } from "@/components/business-crm/partner-contact-form";
import { ContactQuickImport } from "@/components/contacts/contact-quick-import";
import type { ContactDraft } from "@/lib/contact-draft";

type CompanyOption = { id: string; name: string };

// Business portal counterpart to NewContactForm (src/components/contacts/
// new-contact-form.tsx) — same quick-import-then-review flow, wired to the
// partner-scoped scan/import actions so a resolved company lands in
// PartnerCompany rather than the system Company table.
export function NewPartnerContactForm({
  companies,
  defaultCompanyId,
}: {
  companies: CompanyOption[];
  defaultCompanyId?: string;
}) {
  const [draft, setDraft] = useState<ContactDraft | null>(null);
  // A quick-import can resolve to a company that didn't exist when
  // `companies` was fetched server-side — merge it in locally so the
  // combobox actually has an option for it.
  const [companyList, setCompanyList] = useState(companies);
  // PartnerContactForm's text fields are uncontrolled (defaultValue) —
  // bumping this key remounts it with fresh defaults from the new draft.
  const [version, setVersion] = useState(0);

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-100 pb-4 dark:border-neutral-800">
        <ContactQuickImport
          scanAction={scanPartnerBusinessCard}
          importAction={importPartnerVCard}
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
      <PartnerContactForm
        key={version}
        action={createPartnerContact}
        companies={companyList}
        defaultCompanyId={draft?.company?.id ?? defaultCompanyId}
        prefill={draft ?? undefined}
        submitLabel="Create contact"
      />
    </div>
  );
}

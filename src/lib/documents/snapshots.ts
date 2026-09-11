import "server-only";

import type { BillingSettings } from "@/lib/settings";

// Issuer details copied onto a document at issue, so later Settings edits
// never rewrite what a client received.
export function issuerSnapshot(settings: BillingSettings) {
  return {
    issuerName: settings.businessName || null,
    issuerRegistrationNo: settings.businessRegistrationNo,
    issuerTaxNo: settings.taxRate > 0 ? settings.taxRegistrationNo : null,
    issuerAddress: settings.businessAddress,
    issuerPhone: settings.businessPhone,
    issuerEmail: settings.businessEmail,
  };
}

// Bill-to defaults for a fresh draft — prefilled from the deal's contact and
// company, editable on the form, frozen at issue.
export function billToDefaults(
  contact: { firstName: string; lastName: string | null; email: string | null } | null,
  company: { name: string; registrationNo: string | null; address: string | null } | null,
) {
  const name = contact ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") : "";
  return {
    billToName: name || "",
    billToCompany: company?.name ?? "",
    billToRegistrationNo: company?.registrationNo ?? "",
    billToAddress: company?.address ?? "",
    billToEmail: contact?.email ?? "",
  };
}

import type { CompanyOption } from "@/lib/companies";

// Shared shape for a not-yet-saved Contact pulled from a quick-import
// source (a scanned business card, an imported vCard) — fed into
// ContactForm's `prefill` prop so the user can review/edit before saving,
// the same way both sources end up producing.
//
// `company` carries both id and name (not just id) because it may be a
// company that didn't exist until this exact request created it — the
// name lets the client merge it into its already-rendered company list,
// which was fetched before that company existed.
export type ContactDraft = {
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  company: CompanyOption | null;
};

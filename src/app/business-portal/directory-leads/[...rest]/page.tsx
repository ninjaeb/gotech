import { permanentRedirect } from "next/navigation";

// Catches the old /business-portal/directory-leads/<id> URL — mainly a
// WhatsApp lead notification sent before the rename (see
// notifyPartnerOfNewLead in src/lib/directory-notify.ts) — and 301s to the
// same id under /business-portal/business-leads instead. See the sibling
// page.tsx one level up for the bare /directory-leads redirect.
export default async function LegacyDirectoryLeadDetailRedirect({
  params,
}: {
  params: Promise<{ rest: string[] }>;
}) {
  const { rest } = await params;
  permanentRedirect(`/business-portal/business-leads/${rest.join("/")}`);
}

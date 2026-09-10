import { permanentRedirect } from "next/navigation";

// Renamed to /business-portal/business-leads (see business-nav-items.ts) —
// kept as a permanent redirect so an old bookmark, or a WhatsApp lead
// notification sent before the rename (see notifyPartnerOfNewLead in
// src/lib/directory-notify.ts), still lands on the real page instead of
// 404ing. The sibling [...rest] route right below covers the per-lead
// detail URL the same way.
export default function LegacyDirectoryLeadsRedirect() {
  permanentRedirect("/business-portal/business-leads");
}

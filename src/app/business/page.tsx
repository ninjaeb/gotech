import { permanentRedirect } from "next/navigation";

// The signed-in partner portal used to live at the bare /business — moved
// to /business-portal once /business itself became the public directory's
// own locale-prefixed word (/en|/zh|/ms/business, see directoryHomePath in
// src/lib/directory-i18n.ts), to keep the two from reading as the same
// thing. Kept as a permanent redirect so an old bookmark, saved link, or a
// WhatsApp lead notification sent before the rename still lands on the
// real portal instead of 404ing or falling through to the CRM's own
// /system/login gate. The sibling [...rest] route right below covers every
// deeper old /business/... URL the same way.
export default function LegacyBusinessPortalHomeRedirect() {
  permanentRedirect("/business-portal");
}

import { redirect } from "next/navigation";

// This page used to be the editor itself, back when a partner account could
// only ever have one listing — see src/app/business-portal/(dashboard)/listings
// for its replacement. Kept as a redirect so an old bookmark or link still
// lands somewhere useful rather than 404ing.
export default function LegacyPartnerListingRedirect() {
  redirect("/business-portal/listings");
}

import { permanentRedirect } from "next/navigation";

// Catches every old /business/<...anything> URL — login, profile, a
// specific listing, a directory lead — and 301s to the same path segments
// under /business-portal instead (see the sibling page.tsx one level up
// for the bare /business home, and its own comment for why the portal
// moved off /business at all). A single generic rewrite here, rather than
// one redirect stub per old page, since every one of these old URLs maps
// onto its new counterpart by swapping just the one leading segment.
export default async function LegacyBusinessPortalCatchAllRedirect({
  params,
}: {
  params: Promise<{ rest: string[] }>;
}) {
  const { rest } = await params;
  permanentRedirect(`/business-portal/${rest.join("/")}`);
}

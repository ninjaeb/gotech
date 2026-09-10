import { notFound, permanentRedirect } from "next/navigation";
import { resolveDirectoryLocale } from "@/lib/directory-locale";

// Catches every old /[locale]/directory/<...anything> URL — a listing
// (.../acme-two), its recommend-link sub-route (.../acme-two/r/<code>),
// signup, or a category page — and 301s to the same path segments under
// /[locale]/business instead (see the sibling page.tsx one level up for
// the bare /[locale]/directory home, and directoryHomePath in
// directory-i18n.ts for why the real content lives there now). A single
// generic rewrite here, rather than one redirect stub per old page, since
// every one of these old URLs maps onto its new counterpart by swapping
// just the one path segment — nothing else about the shape changes.
export default async function LegacyLocaleDirectoryCatchAllRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; rest: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ locale, rest }, query] = await Promise.all([params, searchParams]);
  const resolved = resolveDirectoryLocale(locale);
  if (!resolved) notFound();

  const qs = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined),
  ).toString();
  permanentRedirect(`/${resolved}/business/${rest.join("/")}${qs ? `?${qs}` : ""}`);
}

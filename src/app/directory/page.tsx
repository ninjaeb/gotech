import { permanentRedirect } from "next/navigation";
import { getDirectoryLocale, isDirectoryLocale } from "@/lib/directory-locale";
import { directoryHomePath } from "@/lib/directory-i18n";

// Superseded by the locale-prefixed route (src/app/[locale]/directory) —
// kept only so old bookmarks/indexed links to this bare URL still land
// somewhere real instead of 404ing. ?lang= (this page's own old override)
// wins if present; otherwise the same cookie/Accept-Language guess as
// before decides which language variant to send a visitor to. Every other
// query param (q, industry, category) carries straight through.
export default async function LegacyDirectoryHomeRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { lang, ...rest } = params;
  const locale = isDirectoryLocale(lang) ? lang : await getDirectoryLocale();
  const query = new URLSearchParams(
    Object.entries(rest).filter((entry): entry is [string, string] => entry[1] !== undefined),
  ).toString();
  permanentRedirect(`${directoryHomePath(locale)}${query ? `?${query}` : ""}`);
}

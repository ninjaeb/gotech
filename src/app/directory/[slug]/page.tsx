import { permanentRedirect } from "next/navigation";
import { getDirectoryLocale, isDirectoryLocale } from "@/lib/directory-locale";
import { directoryListingPath } from "@/lib/directory-i18n";

// Superseded by the locale-prefixed route (src/app/[locale]/directory) —
// kept only so old bookmarks/indexed links to this bare URL still land
// somewhere real instead of 404ing.
export default async function LegacyDirectoryListingRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const [{ slug }, { lang }] = await Promise.all([params, searchParams]);
  const locale = isDirectoryLocale(lang) ? lang : await getDirectoryLocale();
  permanentRedirect(directoryListingPath(locale, slug));
}

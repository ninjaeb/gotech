import { permanentRedirect } from "next/navigation";
import { getDirectoryLocale } from "@/lib/directory-locale";
import { directorySignupPath } from "@/lib/directory-i18n";

// Superseded by the locale-prefixed route (src/app/[locale]/directory) —
// kept only so old bookmarks/indexed links to this bare URL still land
// somewhere real instead of 404ing.
export default async function LegacyDirectorySignupRedirect() {
  const locale = await getDirectoryLocale();
  permanentRedirect(directorySignupPath(locale));
}

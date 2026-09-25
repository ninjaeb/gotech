import { permanentRedirect } from "next/navigation";
import { getDirectoryLocale } from "@/lib/directory-locale";
import { directoryBenefitsPath } from "@/lib/directory-i18n";

// Superseded by the locale-prefixed route (src/app/[locale]/business/benefits)
// — kept only so old bookmarks/indexed links to this bare URL still land
// somewhere real instead of 404ing, same as src/app/directory/signup.
export default async function LegacyDirectoryBenefitsRedirect() {
  const locale = await getDirectoryLocale();
  permanentRedirect(directoryBenefitsPath(locale));
}

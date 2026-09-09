import { cookies, headers } from "next/headers";
import { DEFAULT_DIRECTORY_LOCALE, type DirectoryLocale } from "@/lib/directory-i18n";

// Read server-side (a cookie, not localStorage) so the very first render —
// including generateMetadata's title/description on the listing detail
// page — already comes back in the right language, rather than flashing
// English first the way the plain /lead form's client-only locale does.
export const DIRECTORY_LOCALE_COOKIE = "directory_locale";

// Exported for pages that carry a friendly, per-language URL (every
// /[locale]/directory/... route's own leading segment, or a legacy ?lang=
// override on the old bare /directory/* redirect stubs) — a crawler never
// sends the directory_locale cookie, so this is how those URLs actually
// render in a specific language rather than always falling back to
// English or an Accept-Language guess.
export function isDirectoryLocale(value: string | undefined): value is DirectoryLocale {
  return value === "en" || value === "zh" || value === "ms";
}

// Same check, but returning the narrowed value (or null) instead of acting
// as a type guard — what every /[locale]/... route's own generateMetadata
// and page component call to validate their own URL segment and notFound()
// on anything else, since App Router route params arrive as plain strings.
export function resolveDirectoryLocale(locale: string): DirectoryLocale | null {
  return isDirectoryLocale(locale) ? locale : null;
}

// The cookie wins once a visitor has actually picked a language; before
// that, a best-effort guess from the browser's own Accept-Language header
// so a Malay- or Chinese-reading visitor doesn't land in English by
// default. Neither says anything usable → English.
export async function getDirectoryLocale(): Promise<DirectoryLocale> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(DIRECTORY_LOCALE_COOKIE)?.value;
  if (isDirectoryLocale(cookieValue)) return cookieValue;

  const acceptLanguage = (await headers()).get("accept-language") ?? "";
  if (/\bzh\b/i.test(acceptLanguage)) return "zh";
  if (/\bms\b/i.test(acceptLanguage)) return "ms";
  return DEFAULT_DIRECTORY_LOCALE;
}

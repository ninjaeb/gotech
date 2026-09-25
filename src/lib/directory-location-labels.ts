import type { DirectoryLocale } from "@/lib/directory-i18n";
import { DIRECTORY_SITE_NAME_BY_LOCALE } from "@/lib/directory-seo";

// A state/region name is shown exactly as the partner typed it, the same
// way the listing detail page's own state/country pills already do —
// unlike a category, it's not translated per locale (there's no fixed,
// seeded set of values to keep a translation table for).

// A friendly location page's own URL — same shape as categoryPath in
// directory-category-labels.ts. Relative — the caller prepends siteOrigin
// for anything that needs an absolute URL.
export function locationPath(stateSlug: string, locale: DirectoryLocale): string {
  return `/${locale}/business/location/${stateSlug}`;
}

export function locationPageTitle(state: string, locale: DirectoryLocale): string {
  const siteName = DIRECTORY_SITE_NAME_BY_LOCALE[locale];
  if (locale === "zh") return `${state} 企业 | ${siteName}`;
  if (locale === "ms") return `Perniagaan di ${state} | ${siteName}`;
  return `Businesses in ${state} | ${siteName}`;
}

export function locationPageHeading(state: string, locale: DirectoryLocale): string {
  if (locale === "zh") return `${state} 企业`;
  if (locale === "ms") return `Perniagaan di ${state}`;
  return `Businesses in ${state}`;
}

export function locationPageDescription(state: string, locale: DirectoryLocale): string {
  if (locale === "zh") return `浏览 Gotka 网络中位于 ${state} 的值得信赖企业，并直接联系他们。`;
  if (locale === "ms") return `Semak imbas perniagaan yang dipercayai di ${state} dalam rangkaian Gotka dan hubungi terus.`;
  return `Browse trusted businesses in ${state} in the Gotka network and reach out directly.`;
}

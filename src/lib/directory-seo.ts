import type { Metadata } from "next";
import { DEFAULT_DIRECTORY_LOCALE, DIRECTORY_LOCALES, directoryHomePath, type DirectoryLocale } from "@/lib/directory-i18n";
import type { FaqEntry } from "@/lib/directory";

// What every public directory page shares for search engines (SEO) and AI
// answer engines (GEO) that isn't a translated UI string: the brand the
// pages belong to, the robots directives, the hreflang set, and the
// site-level JSON-LD (WebSite/Organization) that each page's own
// CollectionPage/LocalBusiness markup points back at. No database access —
// safe to import from anywhere server-side.

// og:site_name / the WebSite entity's name. Kept apart from
// DIRECTORY_HOME_TITLE_BY_LOCALE ("Business Directory"), which is the home
// page's own name as an H1/breadcrumb — a site name that just repeats the
// page title tells a crawler nothing about who publishes it.
export const DIRECTORY_SITE_NAME_BY_LOCALE: Record<DirectoryLocale, string> = {
  en: "Gotka Business Directory",
  zh: "Gotka 企业目录",
  ms: "Direktori Perniagaan Gotka",
};

// Facebook/Open Graph locale codes for og:locale — ms_MY is in Facebook's
// own list; there's no en_MY, so English uses the generic en_US.
export const OG_LOCALE_BY_DIRECTORY_LOCALE: Record<DirectoryLocale, string> = {
  en: "en_US",
  zh: "zh_CN",
  ms: "ms_MY",
};

export const DIRECTORY_PUBLISHER = {
  name: "Gotka Technologies",
  alternateName: "Gotka",
  url: "https://gotka.com",
} as const;

// max-image-preview:large lets Google show a listing's full logo/share image
// in results and Discover rather than a thumbnail; the -1s lift the default
// snippet/video-preview caps. Applied by every indexable directory page.
export const DIRECTORY_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

// For a page that exists but has nothing to index yet (a category no
// published business carries) — still crawlable with its links followed,
// so it's picked up the moment it fills, but kept out of the index rather
// than sitting there as a near-empty page.
export const DIRECTORY_NOINDEX_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: true,
  googleBot: { index: false, follow: true },
};

// The directory's branded 1200×630 share image, rendered by
// src/app/[locale]/business/opengraph-image.tsx. Every directory page
// references it explicitly, as an absolute URL, rather than leaning on that
// file convention's own inheritance: a nested page that sets its own
// openGraph block — every one of them does, for title/description/url —
// replaces the segment's block wholesale, images included, which silently
// left the category, sign-up and logo-less listing pages with no image.
export const DIRECTORY_SHARE_IMAGE_ALT = "Gotka Business Directory";
export const DIRECTORY_SHARE_IMAGE_SIZE = { width: 1200, height: 630 };

export function directoryShareImage(siteOrigin: string, locale: DirectoryLocale) {
  return {
    url: `${siteOrigin}${directoryHomePath(locale)}/opengraph-image`,
    ...DIRECTORY_SHARE_IMAGE_SIZE,
    alt: DIRECTORY_SHARE_IMAGE_ALT,
  };
}

// Every language version of one page, plus x-default pointing at English —
// what hreflang expects when none of the listed languages matches a
// visitor. Each page passes its own path builder.
export function buildLanguageAlternates(
  siteOrigin: string,
  pathFor: (locale: DirectoryLocale) => string,
): Record<string, string> {
  return {
    ...Object.fromEntries(DIRECTORY_LOCALES.map(({ code }) => [code, `${siteOrigin}${pathFor(code)}`])),
    "x-default": `${siteOrigin}${pathFor(DEFAULT_DIRECTORY_LOCALE)}`,
  };
}

// JSON.stringify doesn't escape "</script>" — a company name or FAQ answer
// containing that literal string could otherwise break out of the script
// tag. < is invisible to JSON parsing but not to an HTML tokenizer, so this
// neutralizes it either way.
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function websiteJsonLdId(siteOrigin: string): string {
  return `${siteOrigin}/#website`;
}

export function organizationJsonLdId(siteOrigin: string): string {
  return `${siteOrigin}/#organization`;
}

// Schema.org WebSite with a SearchAction — tells a search engine the
// directory has its own search box and how to deep-link into it (the ?q=
// param DirectorySearch already reads), and gives every page's
// CollectionPage/LocalBusiness markup one site-level entity to point back
// at through isPartOf.
export function buildDirectoryWebSiteJsonLd(siteOrigin: string, locale: DirectoryLocale, searchPath: string): string {
  return serializeJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteJsonLdId(siteOrigin),
    name: DIRECTORY_SITE_NAME_BY_LOCALE[locale],
    url: `${siteOrigin}/`,
    inLanguage: DIRECTORY_LOCALES.map(({ code }) => code),
    publisher: { "@id": organizationJsonLdId(siteOrigin) },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteOrigin}${searchPath}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  });
}

// Who publishes the directory — the entity an AI answer engine attributes
// the whole thing to. gotka.com (the marketing site) is the organization's
// own URL; this app's icon stands in for a logo.
export function buildDirectoryOrganizationJsonLd(siteOrigin: string): string {
  return serializeJsonLd({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": organizationJsonLdId(siteOrigin),
    name: DIRECTORY_PUBLISHER.name,
    alternateName: DIRECTORY_PUBLISHER.alternateName,
    url: DIRECTORY_PUBLISHER.url,
    logo: `${siteOrigin}/icon-512.png`,
  });
}

// FAQPage is its own top-level entity, never nested inside LocalBusiness or
// CollectionPage. Rich snippets are the SEO payoff; being directly quotable
// Q&A is the GEO one. Shared by a listing's own FAQ and the directory home
// page's.
export function buildFaqJsonLd(faqs: FaqEntry[]): string {
  return serializeJsonLd({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  });
}

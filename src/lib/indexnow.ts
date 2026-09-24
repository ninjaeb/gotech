import { slugify } from "@/lib/slug";
import { categoryPath } from "@/lib/directory-category-labels";
import { DIRECTORY_LOCALES, directoryHomePath, directoryListingPath } from "@/lib/directory-i18n";
import { STATIC_SEO_ORIGIN } from "@/lib/static-seo-origin";

// IndexNow (indexnow.org): one POST tells Bing — and through it Copilot and
// ChatGPT search, which ground on Bing's index — plus Yandex, Naver and
// Seznam that a URL changed, instead of waiting for their next crawl. Google
// doesn't take part. Optional: without INDEXNOW_KEY every call here is a
// no-op. The key is proven by serving it at /indexnow-key.txt (see
// src/app/indexnow-key.txt/route.ts), which is what keyLocation points at.
//
// URLs are built on STATIC_SEO_ORIGIN, same as the static sitemap — the
// submission has to name the host the key file is served from, and these
// pages are only ever meaningfully indexed on the production host.
export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export function indexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  // The protocol's own constraint on a key: 8-128 characters, [a-zA-Z0-9-].
  return key && /^[A-Za-z0-9-]{8,128}$/.test(key) ? key : null;
}

// Fire-and-forget: callers `void` this from a Server Action after the change
// it announces has been saved. Never throws — a search-engine ping must not
// be the reason a listing fails to publish — and logs a warning instead.
export async function notifyIndexNow(urls: string[]): Promise<void> {
  const key = indexNowKey();
  const urlList = [...new Set(urls)].slice(0, 10_000);
  if (!key || urlList.length === 0) return;

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(STATIC_SEO_ORIGIN).host,
        key,
        keyLocation: `${STATIC_SEO_ORIGIN}${INDEXNOW_KEY_PATH}`,
        urlList,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    // 200 and 202 both mean "received"; anything else is worth a log line.
    if (response.status !== 200 && response.status !== 202) {
      console.warn(`IndexNow: ${response.status} ${response.statusText} submitting ${urlList.length} URL(s)`);
    }
  } catch (error) {
    console.warn("IndexNow: submission failed —", error instanceof Error ? error.message : error);
  }
}

// Every language version of a page changes together (one snapshot, three
// locales), so each helper returns all of them.
export function directoryHomeUrls(): string[] {
  return DIRECTORY_LOCALES.map(({ code }) => `${STATIC_SEO_ORIGIN}${directoryHomePath(code)}`);
}

export function directoryListingUrls(slug: string): string[] {
  return DIRECTORY_LOCALES.map(({ code }) => `${STATIC_SEO_ORIGIN}${directoryListingPath(code, slug)}`);
}

export function directoryCategoryUrls(categoryNames: string[]): string[] {
  return categoryNames.flatMap((name) =>
    DIRECTORY_LOCALES.map(({ code }) => `${STATIC_SEO_ORIGIN}${categoryPath(slugify(name), code)}`),
  );
}

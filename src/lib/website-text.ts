import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Fetches a business's own website and boils it down to plain text for the
// AI to read (see autoCreateListingDetails in src/app/actions/directory.ts).
// Best-effort throughout: any page that can't be fetched or isn't HTML is
// simply skipped, since the Google Maps listing alone is still enough to
// draft from. Hard caps everywhere — the URL is partner-supplied, so this
// must never turn into an open-ended crawl or a large download.
const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 600_000;
const MAX_REDIRECTS = 3;
const MAX_HOME_CHARS = 8_000;
const MAX_SUBPAGE_CHARS = 5_000;
const MAX_SUBPAGES = 3;
const USER_AGENT = "Mozilla/5.0 (compatible; GotkaCRM/1.0; +https://gotka.com)";

// The homepage links worth following for more detail — the pages that
// typically spell out what a business actually offers.
const SUBPAGE_PATTERN = /about|service|product|solution|what-we-do|faq|pricing|package|menu|portfolio/i;
const NON_HTML_EXTENSION_PATTERN = /\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|pptx?|mp4|mp3)$/i;

export type WebsitePage = { url: string; title: string; text: string };

// ---------------------------------------------------------------------------
// SSRF guard
// ---------------------------------------------------------------------------

function isPrivateIPv4(address: string): boolean {
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIPv6(address: string): boolean {
  const lower = address.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIPv4(mapped[1]) : false;
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIPv4(address);
  if (version === 6) return isPrivateIPv6(address);
  return true;
}

// The server fetches whatever URL a partner typed, so anything that could
// reach this host's own network — localhost, a private IP, or a hostname
// that resolves to one — is refused before a single byte is requested,
// and again on every redirect hop (see fetchHtml).
async function assertPublicHttpUrl(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs can be fetched.");
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Refusing to fetch a local address.");
  }
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new Error("Refusing to fetch a private address.");
    return;
  }
  const addresses = await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error("Refusing to fetch a private address.");
  }
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

async function readLimited(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks).subarray(0, maxBytes));
}

// Redirects are followed by hand rather than letting fetch do it, so each
// hop's target goes through the same public-address check as the first URL.
async function fetchHtml(startUrl: URL): Promise<{ url: URL; html: string } | null> {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHttpUrl(url);
    const response = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => {});
      if (!location) return null;
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      return null;
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      await response.body?.cancel().catch(() => {});
      return null;
    }
    return { url, html: await readLimited(response, MAX_HTML_BYTES) };
  }
  return null;
}

// ---------------------------------------------------------------------------
// HTML → text
// ---------------------------------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  copy: "©",
  reg: "®",
  trade: "™",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  bull: "•",
  middot: "·",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#")) {
      const code = lower.startsWith("#x") ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[lower] ?? match;
  });
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export type ExtractedPage = { title: string; text: string; links: { href: string; text: string }[] };

// Plain-text view of a page: <title> and the meta description first (the
// two lines a site's own author wrote to summarize it), then the visible
// body text with block boundaries kept as line breaks. Scripts, styles,
// and the like are dropped outright. Regex-based on purpose — a full HTML
// parser would be a new dependency for what is, for the AI's purposes,
// just "the words on the page".
export function extractTextFromHtml(html: string, maxChars: number): ExtractedPage {
  const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const metaTag = html.match(/<meta\b[^>]*\bname\s*=\s*["']description["'][^>]*>/i)?.[0] ?? "";
  const metaDescription = decodeEntities(metaTag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1] ?? "").trim();

  const links = [...html.matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((match) => ({
    href: match[1].trim(),
    text: stripTags(match[2]),
  }));

  const body = decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|svg|template|iframe|head)\b[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<(?:br|hr)\b[^>]*>|<\/(?:p|div|li|h[1-6]|tr|section|article|header|footer|nav|blockquote|td|th|dd|dt|ul|ol|table|figcaption)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const text = [metaDescription, body].filter(Boolean).join("\n\n").slice(0, maxChars);
  return { title, text, links };
}

function hostKey(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

function pickSubpages(home: URL, links: ExtractedPage["links"]): URL[] {
  const picked: URL[] = [];
  const seen = new Set<string>([home.pathname.replace(/\/$/, "") || "/"]);
  for (const link of links) {
    let target: URL;
    try {
      target = new URL(link.href, home);
    } catch {
      continue;
    }
    if ((target.protocol !== "http:" && target.protocol !== "https:") || hostKey(target) !== hostKey(home)) continue;
    const path = target.pathname.replace(/\/$/, "") || "/";
    if (seen.has(path) || NON_HTML_EXTENSION_PATTERN.test(path)) continue;
    if (!SUBPAGE_PATTERN.test(path) && !SUBPAGE_PATTERN.test(link.text)) continue;
    seen.add(path);
    target.hash = "";
    picked.push(target);
    if (picked.length >= MAX_SUBPAGES) break;
  }
  return picked;
}

// `website` must already be an absolute http(s) URL (see normalizeWebsiteUrl
// in src/lib/directory.ts). Returns the homepage first, then whichever
// about/services/etc. pages it links to that could be read — or an empty
// list when even the homepage couldn't be, so the caller can carry on with
// the Google Maps listing alone.
export async function fetchWebsiteText(website: string): Promise<WebsitePage[]> {
  let home: Awaited<ReturnType<typeof fetchHtml>>;
  try {
    home = await fetchHtml(new URL(website));
  } catch {
    return [];
  }
  if (!home) return [];

  const homePage = extractTextFromHtml(home.html, MAX_HOME_CHARS);
  const pages: WebsitePage[] = [];
  if (homePage.text) pages.push({ url: home.url.toString(), title: homePage.title, text: homePage.text });

  const subpages = await Promise.allSettled(pickSubpages(home.url, homePage.links).map((url) => fetchHtml(url)));
  for (const result of subpages) {
    if (result.status !== "fulfilled" || !result.value) continue;
    const page = extractTextFromHtml(result.value.html, MAX_SUBPAGE_CHARS);
    if (page.text) pages.push({ url: result.value.url.toString(), title: page.title, text: page.text });
  }
  return pages;
}

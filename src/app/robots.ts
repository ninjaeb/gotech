import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

// Crawlable by default, except the two login-gated app areas: /system (the
// internal staff CRM) and /business-portal (the partner portal). Disallow
// is a prefix match, so each entry also covers everything under it
// (/system/login, /system/deals/[id], /business-portal/login, etc.).
// Neither actually risks leaking anything by being crawled — a crawler
// can't get past either one's own login page regardless — this is purely
// about not showing a bare "Sign in" page or an empty dashboard shell in
// search results. (/business-portal's bare URL is still listed in
// sitemap.xml despite being disallowed here — see that file's own comment
// for why; /system isn't, for the same reason given there.)
//
// Everything else is allowed by default rather than hand-maintained on an
// allowlist: the public business directory (/en|/zh|/ms/business), the
// client portal's own login/dashboard pages, lead/quote links, the
// embeddable widget scripts, and webhook endpoints. This also means
// /sitemap.xml and /llms.txt don't need their own explicit allow entries
// the way they did under the old disallow-by-default rule — see this
// repo's history for that bug (Google Search Console's URL Inspection
// reported /sitemap.xml itself as "blocked by robots.txt" — it was never
// on the old allowlist, even though the `sitemap:` line below always
// pointed at it).
export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteOrigin = await getSiteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/system", "/business-portal"],
      },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}

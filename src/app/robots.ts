import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

// Crawlable by default now, except the internal staff CRM at /system (and
// everything under it — robots.txt Disallow is a prefix match, so this one
// entry covers /system/login, /system/deals/[id], etc. too). /system is
// where deal values, contacts, and every other business-internal record
// live behind a login wall — a crawler can't actually get past
// /system/login either way, so nothing sensitive would leak by allowing
// it, but a bare "Sign in" page and an otherwise-empty CRM shell have no
// business showing up in search results, so it's the one thing kept out
// deliberately rather than left to Google's own judgment.
//
// Everything else is now allowed by default rather than hand-maintained on
// an allowlist: the public business directory (/en|/zh|/ms/business), the
// business-portal and client-portal login/dashboard pages (also
// login-gated, same reasoning as /system, but a partner searching for
// their own portal is a real use case /system doesn't have), lead/quote
// links, the embeddable widget scripts, and webhook endpoints. This also
// means /sitemap.xml and /llms.txt no longer need their own explicit allow
// entries the way they did under the old disallow-by-default rule — see
// this repo's history for that bug (Google Search Console's URL Inspection
// reported /sitemap.xml itself as "blocked by robots.txt" — it was never
// on the old allowlist, even though the `sitemap:` line below always
// pointed at it).
export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteOrigin = await getSiteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/system"],
      },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}

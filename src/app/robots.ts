import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

// Every other route either requires a login (so a crawler can't reach it
// regardless) or is a single-purpose embed/form page with nothing worth
// indexing — the partner directory is the one part of this app meant to be
// found via search, now living under /en|/zh|/ms/business (renamed from
// /directory for a friendlier public URL). The bare /directory and
// locale-prefixed /en|/zh|/ms/directory paths are permanent redirects now
// (see src/app/directory/ and src/app/[locale]/directory/) rather than
// real content, but stay allowed so a crawler that already indexed one
// under the old scheme can still fetch it, follow the redirect, and
// transfer over to the real /business URL instead of the old entry just
// going stale. Bare /business (no locale) is deliberately left off this
// list — that one's the signed-in partner portal, not public content.
// /llms.txt (see that route's own comment) is listed too — nothing there
// that this disallow-by-default rule should actually block, but an AI
// system that does treat robots.txt as gating everything, llms.txt
// included, should still be able to fetch it.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteOrigin = await getSiteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/directory",
          "/en/directory",
          "/zh/directory",
          "/ms/directory",
          "/en/business",
          "/zh/business",
          "/ms/business",
          "/llms.txt",
        ],
        disallow: "/",
      },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}

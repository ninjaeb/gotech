import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

// Every other route either requires a login (so a crawler can't reach it
// regardless) or is a single-purpose embed/form page with nothing worth
// indexing — the partner directory is the one part of this app meant to be
// found via search. /directory itself (bare, no locale) is a permanent
// redirect now (see src/app/directory/page.tsx) rather than real content,
// but stays allowed so a crawler that already indexed it under the old
// scheme can still fetch it, follow the redirect, and transfer over to the
// real /en|/zh|/ms URL instead of the old entry just going stale.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteOrigin = await getSiteOrigin();
  return {
    rules: [
      { userAgent: "*", allow: ["/directory", "/en/directory", "/zh/directory", "/ms/directory"], disallow: "/" },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}

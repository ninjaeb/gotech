import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

// Every other route either requires a login (so a crawler can't reach it
// regardless) or is a single-purpose embed/form page with nothing worth
// indexing — the partner directory is the one part of this app meant to be
// found via search.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteOrigin = await getSiteOrigin();
  return {
    rules: [{ userAgent: "*", allow: "/directory", disallow: "/" }],
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}

import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getSiteOrigin } from "@/lib/site-url";

// The only part of this app crawlers can actually reach — everything else
// sits behind the login wall (see robots.ts), so this lists just the
// public directory: its home page plus every currently-published partner
// listing.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteOrigin = await getSiteOrigin();
  const listings = await db.partnerListing.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  return [
    { url: `${siteOrigin}/directory`, changeFrequency: "daily", priority: 0.8 },
    ...listings.map(({ slug, updatedAt }) => ({
      url: `${siteOrigin}/directory/${slug}`,
      lastModified: updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}

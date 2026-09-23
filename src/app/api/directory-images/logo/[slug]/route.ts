import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { readPublishedSnapshot } from "@/lib/directory";

const DATA_URL_PATTERN = /^data:([^;,]+);base64,([\s\S]+)$/;

// Serves a listing's logo as a real, fetchable URL — what the directory grid
// and detail page render (see ListingLogo) and what Open Graph/Twitter/
// JSON-LD image tags point at (see generateMetadata in
// src/app/[locale]/business/[slug]/page.tsx); none of those can use a data:
// URI without inlining the whole image into the page. logoUrl is stored as a
// data: URL (see photoDataUrl), so this just decodes and re-serves it under
// a real path.
//
// Reads the *published snapshot*, not the live row — same invariant as the
// detail page itself: a partner's unapproved logo edit must never leak out
// through this route either.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const row = await db.partnerListing.findUnique({ where: { slug }, select: { publishedSnapshot: true } });
  const listing = row ? readPublishedSnapshot(row.publishedSnapshot) : null;
  const match = listing?.logoUrl ? DATA_URL_PATTERN.exec(listing.logoUrl) : null;
  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, "base64");
  // A ?v= (the listing's publish timestamp — see listingLogoPath) changes
  // whenever the logo can, since every replacement is re-approved, so that
  // form is safe to cache for good. The bare URL keeps a short lifetime: a
  // listing keeps the same slug across however many logo replacements, so
  // nothing else about it would ever tell a cache the image moved on.
  const cacheControl = request.nextUrl.searchParams.has("v")
    ? "public, max-age=31536000, immutable"
    : "public, max-age=300, must-revalidate";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": cacheControl,
    },
  });
}

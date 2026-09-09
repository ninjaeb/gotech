import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { readPublishedSnapshot } from "@/lib/directory";

const DATA_URL_PATTERN = /^data:([^;,]+);base64,([\s\S]+)$/;

// Serves a listing's logo as a real, fetchable URL — used for Open Graph/
// Twitter/JSON-LD image tags on the detail page (see generateMetadata in
// src/app/directory/[slug]/page.tsx), none of which can use a data: URI
// directly; a crawler fetches the URL itself rather than reading inline
// page content. logoUrl is stored as a data: URL (see photoDataUrl), so
// this just decodes and re-serves it under a real path.
//
// Reads the *published snapshot*, not the live row — same invariant as the
// detail page itself: a partner's unapproved logo edit must never leak out
// through this route either.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const row = await db.partnerListing.findUnique({ where: { slug }, select: { publishedSnapshot: true } });
  const listing = row ? readPublishedSnapshot(row.publishedSnapshot) : null;
  const match = listing?.logoUrl ? DATA_URL_PATTERN.exec(listing.logoUrl) : null;
  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, "base64");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      // Short, not immutable — unlike an uploaded About image (its own id
      // never changes meaning), a listing keeps the same slug across
      // however many times its logo gets replaced and re-approved.
      "Cache-Control": "public, max-age=300, must-revalidate",
    },
  });
}

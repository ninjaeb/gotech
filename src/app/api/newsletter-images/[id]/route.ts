import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

// Serves a newsletter image's bytes, decoded from NewsletterImage.data
// (base64) — deliberately public (unlike /api/attachments/[id], which
// requires a staff session) since these URLs get embedded in emails opened
// by recipients who were never logged in at all. See src/proxy.ts's
// ALWAYS_PUBLIC_PREFIXES, which is what actually lets a logged-out request
// reach this route rather than getting redirected to /login first.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const image = await db.newsletterImage.findUnique({
    where: { id },
    select: { data: true, mimeType: true },
  });
  if (!image) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = Buffer.from(image.data, "base64");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": image.mimeType,
      // Immutable — an image's bytes never change after upload, and its id
      // is never reused for different content.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

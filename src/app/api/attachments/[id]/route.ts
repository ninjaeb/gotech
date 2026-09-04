import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { db } from "@/lib/db";

// Serves an attachment's bytes, decoded from Attachment.data (base64) on
// demand — kept out of the activity feed / task page's own payload, same
// reasoning as /api/whatsapp/media/[activityId], so a page with many notes
// never has to re-serialize every attachment just to render the timeline.
// Gated on being logged in (not admin-only) — developers can view Tasks and
// their activity same as admins, just with restricted mutation rights.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verifySession();
  } catch {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { id } = await params;

  const attachment = await db.attachment.findUnique({
    where: { id },
    select: { data: true, mimeType: true, fileName: true },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = Buffer.from(attachment.data, "base64");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${attachment.fileName.replace(/"/g, "")}"`,
      // Immutable — an attachment's bytes never change after it's uploaded.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

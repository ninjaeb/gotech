import { NextResponse, type NextRequest } from "next/server";
import { requireAdminAction } from "@/lib/auth/dal";
import { db } from "@/lib/db";

// Serves a WhatsApp attachment's bytes, decoded from Activity.whatsappMediaData
// (base64) on demand — kept out of the thread page/poll route's own JSON so
// a multi-MB video never gets re-serialized on every 2-second poll tick; the
// browser fetches (and caches) this URL only when actually rendering the
// message. Gated the same way as viewing the thread itself.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ activityId: string }> }) {
  try {
    await requireAdminAction();
  } catch {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }
  const { activityId } = await params;

  const activity = await db.activity.findUnique({
    where: { id: activityId },
    select: { whatsappMediaData: true, whatsappMediaMimeType: true, whatsappMediaName: true },
  });
  if (!activity?.whatsappMediaData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = Buffer.from(activity.whatsappMediaData, "base64");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": activity.whatsappMediaMimeType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${(activity.whatsappMediaName ?? "attachment").replace(/"/g, "")}"`,
      // Immutable — an Activity's attachment never changes after it's sent.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

import { NextResponse, type NextRequest } from "next/server";
import { requireAdminAction } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { parseWhatsAppActivityContent } from "@/lib/whatsapp";

// Polled client-side by WhatsAppThread so new inbound messages and delivery-
// status changes show up without a full page refresh — keeps the reply
// composer's draft and focus completely undisturbed, since only this fetch
// result gets merged into local state rather than the page re-rendering.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ contactId: string }> }) {
  try {
    await requireAdminAction();
  } catch {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }
  const { contactId } = await params;

  const activities = await db.activity.findMany({
    where: { type: "WHATSAPP", contactId },
    orderBy: { createdAt: "asc" },
    select: { id: true, content: true, createdAt: true, whatsappStatus: true },
  });

  return NextResponse.json({
    messages: activities.map((activity) => {
      const { direction, text } = parseWhatsAppActivityContent(activity.content);
      return {
        id: activity.id,
        direction,
        text,
        createdAt: activity.createdAt.toISOString(),
        status: activity.whatsappStatus,
      };
    }),
  });
}

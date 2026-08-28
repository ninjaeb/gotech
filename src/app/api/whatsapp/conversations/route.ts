import { NextResponse } from "next/server";
import { requireAdminAction } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { fullName } from "@/lib/format";
import { isWhatsAppConversationUnread, parseWhatsAppActivityContent } from "@/lib/whatsapp";

// Polled client-side by WhatsAppInboxList for live conversation
// previews/ordering and unread state, same reasoning as the thread route.
export async function GET() {
  try {
    await requireAdminAction();
  } catch {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  // orderBy before distinct is what makes this "the latest Activity per
  // contact" rather than an arbitrary row per contact — Prisma applies
  // distinct to the already-sorted result set.
  const latest = await db.activity.findMany({
    where: { type: "WHATSAPP", contactId: { not: null } },
    orderBy: { createdAt: "desc" },
    distinct: ["contactId"],
    select: {
      id: true,
      content: true,
      createdAt: true,
      contact: {
        select: { id: true, firstName: true, lastName: true, photoUrl: true, whatsappLastReadAt: true },
      },
    },
  });

  return NextResponse.json({
    conversations: latest.flatMap(({ id, content, createdAt, contact }) => {
      if (!contact) return [];
      const { direction, text } = parseWhatsAppActivityContent(content);
      return [
        {
          id,
          contactId: contact.id,
          name: fullName(contact.firstName, contact.lastName),
          photoUrl: contact.photoUrl,
          direction,
          text,
          createdAt: createdAt.toISOString(),
          isUnread: isWhatsAppConversationUnread(content, createdAt, contact.whatsappLastReadAt),
        },
      ];
    }),
  });
}

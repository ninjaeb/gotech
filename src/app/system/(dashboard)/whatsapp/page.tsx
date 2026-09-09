import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { fullName } from "@/lib/format";
import { isWhatsAppConversationUnread, parseWhatsAppActivityContent } from "@/lib/whatsapp";
import { WhatsAppInboxList, type ConversationSummary } from "@/components/whatsapp/whatsapp-inbox-list";

export default async function WhatsAppInboxPage() {
  await requireAdmin();

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

  const initialConversations: ConversationSummary[] = latest.flatMap(({ id, content, createdAt, contact }) => {
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
  });

  return (
    <div>
      <PageHeader
        title="WhatsApp"
        description={`${initialConversations.length} ${initialConversations.length === 1 ? "conversation" : "conversations"}`}
      />
      <WhatsAppInboxList initialConversations={initialConversations} />
    </div>
  );
}

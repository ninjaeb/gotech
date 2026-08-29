import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { fullName } from "@/lib/format";
import { WHATSAPP_ACCOUNT_ID, activityToThreadMessage } from "@/lib/whatsapp";
import { WhatsAppThread, type ThreadMessage } from "@/components/whatsapp/whatsapp-thread";

export default async function WhatsAppThreadPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  await requireAdmin();
  const { contactId } = await params;

  const [contact, hasWhatsAppAccount, activities] = await Promise.all([
    db.contact.findUnique({
      where: { id: contactId },
      select: { id: true, firstName: true, lastName: true, phone: true },
    }),
    db.whatsAppAccount.findUnique({ where: { id: WHATSAPP_ACCOUNT_ID }, select: { id: true } }).then(Boolean),
    db.activity.findMany({
      where: { type: "WHATSAPP", contactId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        whatsappStatus: true,
        whatsappMediaType: true,
        whatsappMediaMimeType: true,
        whatsappMediaName: true,
      },
    }),
  ]);

  if (!contact) notFound();
  const contactName = fullName(contact.firstName, contact.lastName);

  const initialMessages: ThreadMessage[] = activities.map(activityToThreadMessage);

  return (
    <div className="flex flex-col">
      <PageHeader
        breadcrumbs={[{ label: "WhatsApp", href: "/whatsapp" }, { label: contactName }]}
        title={contactName}
        description={contact.phone ?? "No phone number on file"}
      />
      <WhatsAppThread
        contactId={contact.id}
        contactName={contactName}
        initialMessages={initialMessages}
        hasWhatsAppAccount={hasWhatsAppAccount}
        contactPhone={contact.phone}
      />
    </div>
  );
}

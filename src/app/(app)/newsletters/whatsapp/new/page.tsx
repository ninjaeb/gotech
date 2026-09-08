import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { WhatsAppBroadcastForm } from "@/components/newsletters/whatsapp-broadcast-form";

export default async function NewWhatsAppBroadcastPage() {
  const lists = await db.contactList.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Newsletters", href: "/newsletters" }, { label: "New WhatsApp broadcast" }]}
        title="New WhatsApp broadcast"
        description="Sends immediately to a list's WhatsApp-opted-in contacts via the approved update template"
      />
      <Card>
        <CardBody>
          <WhatsAppBroadcastForm lists={lists} />
        </CardBody>
      </Card>
    </div>
  );
}

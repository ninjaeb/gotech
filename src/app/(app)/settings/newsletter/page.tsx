import { requireAdmin } from "@/lib/auth/dal";
import { getNewsletterSender } from "@/lib/newsletter-sender";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { NewsletterSenderForm } from "@/components/settings/newsletter-sender-form";

export default async function NewsletterSettingsPage() {
  await requireAdmin();
  const sender = await getNewsletterSender();

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Newsletter" }]}
        title="Newsletter"
        description="The shared mailbox newsletters send from"
      />
      <Card>
        <CardHeader>
          <CardTitle>Sending mailbox</CardTitle>
        </CardHeader>
        <CardBody>
          <NewsletterSenderForm sender={sender} />
        </CardBody>
      </Card>
    </div>
  );
}

import { requirePartner } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PartnerProfileForm } from "@/components/partner/partner-profile-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export default async function PartnerProfilePage() {
  const user = await requirePartner();
  const { phone } = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { phone: true } });

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your own login — email, contact phone, and password." />

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardBody>
          <PartnerProfileForm email={user.email} phone={phone} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change your password</CardTitle>
        </CardHeader>
        <CardBody>
          <ChangePasswordForm />
        </CardBody>
      </Card>
    </div>
  );
}

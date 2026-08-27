import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ServicePackageForm } from "@/components/settings/service-package-form";

export default async function EditServicePackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const servicePackage = await db.servicePackage.findUnique({ where: { id } });
  if (!servicePackage) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Products & Services", href: "/settings/products" },
          { label: servicePackage.name },
        ]}
        title={servicePackage.name}
      />
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardBody>
          <ServicePackageForm
            servicePackage={{
              id: servicePackage.id,
              name: servicePackage.name,
              type: servicePackage.type,
              description: servicePackage.description,
              unitPrice: Number(servicePackage.unitPrice),
              unit: servicePackage.unit,
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ServicePackageForm } from "@/components/settings/service-package-form";
import { getCurrency } from "@/lib/settings";

export default async function EditServicePackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [servicePackage, otherPackages, currency] = await Promise.all([
    db.servicePackage.findUnique({
      where: { id },
      include: { components: { orderBy: { sortOrder: "asc" } } },
    }),
    db.servicePackage.findMany({
      where: { id: { not: id } },
      include: { _count: { select: { components: true } } },
    }),
    getCurrency(),
  ]);
  if (!servicePackage) notFound();

  // Eligible as a component of THIS bundle: not itself, and not already a
  // bundle (one level deep only — see service-packages.ts).
  const availableComponents = otherPackages
    .filter((pkg) => pkg._count.components === 0)
    .map((pkg) => ({ id: pkg.id, name: pkg.name, unitPrice: Number(pkg.unitPrice) }));

  return (
    <div className="space-y-6">
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
              unitCost: servicePackage.unitCost === null ? null : Number(servicePackage.unitCost),
              unit: servicePackage.unit,
              billingFrequency: servicePackage.billingFrequency,
              components: servicePackage.components.map((c) => ({
                productId: c.productId,
                quantity: Number(c.quantity),
              })),
            }}
            availableComponents={availableComponents}
            currency={currency}
          />
        </CardBody>
      </Card>
    </div>
  );
}

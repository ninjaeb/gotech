import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteServicePackage } from "@/app/actions/service-packages";
import { requireAdmin } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { ServicePackageForm } from "@/components/settings/service-package-form";
import { getCurrency } from "@/lib/settings";
import { formatCurrency } from "@/lib/format";
import { marginPercent } from "@/lib/margin";
import {
  PRODUCT_SERVICE_TYPE_LABELS,
  PRODUCT_SERVICE_TYPE_BADGE_CLASSES,
  BILLING_FREQUENCY_LABELS,
} from "@/lib/labels";

export default async function ProductsPage() {
  await requireAdmin();
  const [servicePackages, currency] = await Promise.all([
    db.servicePackage.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: { _count: { select: { components: true } } },
    }),
    getCurrency(),
  ]);

  // Eligible as a component of a NEW bundle: any item that isn't itself
  // already a bundle (one level deep only — see service-packages.ts).
  const availableComponents = servicePackages
    .filter((pkg) => pkg._count.components === 0)
    .map((pkg) => ({ id: pkg.id, name: pkg.name, unitPrice: Number(pkg.unitPrice) }));

  return (
    <div className="max-w-lg">
      <PageHeader
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Products & Services" }]}
        title="Products & Services"
        description="Reusable catalog for building quotes — add each thing you sell once, then pull it into any quote's line items."
      />
      <Card>
        <CardBody className="space-y-4">
          {servicePackages.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nothing in the catalog yet — add your first product or service below.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {servicePackages.map((pkg) => {
                const pct = marginPercent(Number(pkg.unitPrice), pkg.unitCost === null ? null : Number(pkg.unitCost));
                return (
                  <li key={pkg.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 truncate font-medium text-slate-800 dark:text-slate-200">
                        {pkg.name}
                        <Badge className={PRODUCT_SERVICE_TYPE_BADGE_CLASSES[pkg.type]}>
                          {PRODUCT_SERVICE_TYPE_LABELS[pkg.type]}
                        </Badge>
                        {pkg._count.components > 0 && (
                          <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30">
                            Bundle of {pkg._count.components}
                          </Badge>
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {formatCurrency(pkg.unitPrice.toString(), currency)}
                        {pkg.unit && ` / ${pkg.unit}`}
                        {` · ${BILLING_FREQUENCY_LABELS[pkg.billingFrequency]}`}
                        {pct !== null && ` · ${pct.toFixed(0)}% margin`}
                        {pkg.description && ` · ${pkg.description}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/settings/products/${pkg.id}`}
                        title="Edit"
                        aria-label="Edit"
                        className={buttonClasses("secondary", "sm")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <form action={deleteServicePackage.bind(null, pkg.id)}>
                        <ConfirmSubmitButton confirmMessage={`Remove "${pkg.name}" from the catalog?`} size="sm">
                          <Trash2 className="h-3.5 w-3.5" />
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <ServicePackageForm availableComponents={availableComponents} currency={currency} />
        </CardBody>
      </Card>
    </div>
  );
}

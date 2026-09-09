import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListingLogo } from "@/components/directory/listing-logo";
import { INDUSTRY_LABELS } from "@/lib/labels";
import type { PublishedListingSnapshot } from "@/lib/directory";

const MAX_VISIBLE_SERVICES = 3;

export function ListingCard({
  slug,
  listing,
  viewLabel,
}: {
  slug: string;
  listing: PublishedListingSnapshot;
  viewLabel: string;
}) {
  const extraServices = listing.services.length - MAX_VISIBLE_SERVICES;

  return (
    <Link href={`/directory/${slug}`} className="block h-full">
      <Card className="flex h-full flex-col transition-colors hover:border-indigo-300 dark:hover:border-indigo-800">
        <CardBody className="flex flex-1 flex-col gap-3">
          <div className="flex items-center gap-3">
            <ListingLogo name={listing.companyName} logoUrl={listing.logoUrl} className="h-10 w-10 text-sm" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{listing.companyName}</p>
              {listing.industry && (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {INDUSTRY_LABELS[listing.industry]}
                </p>
              )}
            </div>
          </div>

          {listing.tagline && <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{listing.tagline}</p>}

          {listing.services.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {listing.services.slice(0, MAX_VISIBLE_SERVICES).map((service) => (
                <Badge key={service}>{service}</Badge>
              ))}
              {extraServices > 0 && <Badge>+{extraServices}</Badge>}
            </div>
          )}

          <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
            {viewLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </CardBody>
      </Card>
    </Link>
  );
}

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListingLogo } from "@/components/directory/listing-logo";
import type { DirectoryGridListing } from "@/lib/directory";
import { directoryListingPath, type DirectoryLocale } from "@/lib/directory-i18n";

const MAX_VISIBLE_SERVICES = 3;

export function ListingCard({
  listing,
  viewLabel,
  industryLabel,
  locale,
}: {
  listing: DirectoryGridListing;
  viewLabel: string;
  // Pre-resolved for the visitor's locale by the caller (see
  // directory-search.tsx) — this component has no locale of its own to
  // look one up with.
  industryLabel?: string;
  locale: DirectoryLocale;
}) {
  const extraServices = listing.services.length - MAX_VISIBLE_SERVICES;

  return (
    <Link href={directoryListingPath(locale, listing.slug)} className="block h-full">
      <Card className="flex h-full flex-col transition-colors hover:border-petrol/40 dark:hover:border-petrol-light/30">
        <CardBody className="flex flex-1 flex-col gap-3">
          <div className="flex items-center gap-3">
            <ListingLogo name={listing.companyName} logoUrl={listing.logoUrl} size={40} loading="lazy" className="h-10 w-10 text-sm" />
            <div className="min-w-0">
              {/* A heading rather than a <p>: each card's name is an item
                  under the page's H1/H2 outline, which is how a crawler (and
                  a screen reader's heading list) tells the businesses apart
                  from the surrounding copy. Tailwind's preflight leaves
                  headings unstyled, so it looks exactly as before. */}
              <h3 className="truncate font-semibold text-slate-900 dark:text-slate-100">{listing.companyName}</h3>
              {listing.industry && industryLabel && (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{industryLabel}</p>
              )}
            </div>
          </div>

          {listing.tagline && <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{listing.tagline}</p>}

          {listing.services.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {listing.services.slice(0, MAX_VISIBLE_SERVICES).map((service, index) => (
                <Badge key={index} className="bg-led-soft text-petrol-ink ring-led/30 dark:bg-led-soft-dark dark:text-petrol-light dark:ring-led/20">
                  {service.title}
                </Badge>
              ))}
              {extraServices > 0 && (
                <Badge className="bg-led-soft text-petrol-ink ring-led/30 dark:bg-led-soft-dark dark:text-petrol-light dark:ring-led/20">
                  +{extraServices}
                </Badge>
              )}
            </div>
          )}

          <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-medium text-petrol dark:text-petrol-light">
            {viewLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </CardBody>
      </Card>
    </Link>
  );
}

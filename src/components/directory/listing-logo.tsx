import { cn } from "@/lib/utils";

// A partner listing without an uploaded logo falls back to a plain
// initial-letter badge — same idea as ContactAvatar for a contact with no
// photo, just for a company name instead of a person's.
//
// logoUrl is the logo's real, cacheable URL (see listingLogoPath), never the
// data: URL it's stored as — inlining that put the whole image into the
// page's HTML (and again into React's payload) once per listing. `size` is
// the intrinsic width/height in px so the browser reserves the box before
// the image arrives (no layout shift); the className still sets the
// rendered size, which may differ per breakpoint.
export function ListingLogo({
  name,
  logoUrl,
  size = 40,
  loading = "eager",
  className,
}: {
  name: string;
  logoUrl: string | null;
  // Defaults to the small thumbnail every internal preview (admin
  // approvals, the partner's own editor) renders at.
  size?: number;
  // "lazy" for a grid of cards, most of them below the fold; the detail
  // page's own header logo is above it and wants the default.
  loading?: "eager" | "lazy";
  className?: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- served straight out of the DB by /api/directory-images/logo, already sized down by the partner's upload (see photoDataUrl); next/image would add an optimizer round trip per logo on the shared host for no visible gain
      <img
        src={logoUrl}
        alt={`${name} logo`}
        width={size}
        height={size}
        loading={loading}
        decoding="async"
        className={cn("shrink-0 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-neutral-800", className)}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-petrol font-semibold text-white",
        className,
      )}
    >
      {initial}
    </div>
  );
}

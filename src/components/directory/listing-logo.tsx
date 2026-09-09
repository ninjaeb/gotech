import { cn } from "@/lib/utils";

// A partner listing without an uploaded logo falls back to a plain
// initial-letter badge — same idea as ContactAvatar for a contact with no
// photo, just for a company name instead of a person's.
export function ListingLogo({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl: string | null;
  className?: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data: URL, not an optimizable remote/static asset
      <img
        src={logoUrl}
        alt=""
        className={cn("shrink-0 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-neutral-800", className)}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-petrol font-semibold text-white",
        className,
      )}
    >
      {initial}
    </div>
  );
}

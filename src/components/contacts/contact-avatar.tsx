import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

export function ContactAvatar({
  photoUrl,
  name,
  className,
}: {
  photoUrl?: string | null;
  name: string;
  className?: string;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data: URL, not an optimizable remote/static asset
      <img src={photoUrl} alt="" className={cn("shrink-0 rounded-full object-cover", className)} />
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}

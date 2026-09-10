import { notFound, permanentRedirect } from "next/navigation";
import { resolveDirectoryLocale } from "@/lib/directory-locale";
import { directoryHomePath } from "@/lib/directory-i18n";

// /[locale]/directory was the public directory's real home until it moved
// to /[locale]/business (see directoryHomePath in directory-i18n.ts) for a
// friendlier public URL — kept as a permanent redirect so an old link,
// bookmark, or indexed search result still lands on the real page instead
// of 404ing. Query params (q, industry, category, ...) carry straight
// through. The sibling [...rest] route right below covers every deeper
// old /[locale]/directory/... URL the same way.
export default async function LegacyLocaleDirectoryHomeRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const resolved = resolveDirectoryLocale(locale);
  if (!resolved) notFound();

  const qs = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined),
  ).toString();
  permanentRedirect(`${directoryHomePath(resolved)}${qs ? `?${qs}` : ""}`);
}

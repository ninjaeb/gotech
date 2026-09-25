import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveDirectoryLocale } from "@/lib/directory-locale";
import { buildLocationMetadata, LocationPageContent } from "@/components/directory/location-page-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; stateSlug: string }>;
}): Promise<Metadata> {
  const { locale, stateSlug } = await params;
  const resolved = resolveDirectoryLocale(locale);
  if (!resolved) return {};
  return buildLocationMetadata(stateSlug, resolved);
}

// Same reasoning as the category route's own force-dynamic: listings
// change by hand approval, not on a schedule, but a plain Prisma read
// carries no dynamic signal of its own without this.
export const dynamic = "force-dynamic";

export default async function DirectoryLocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; stateSlug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ locale, stateSlug }, { q }] = await Promise.all([params, searchParams]);
  const resolved = resolveDirectoryLocale(locale);
  if (!resolved) notFound();
  return <LocationPageContent stateSlug={stateSlug} locale={resolved} q={q ?? ""} />;
}

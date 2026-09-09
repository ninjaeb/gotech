import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDirectoryLocale } from "@/lib/directory-locale";
import { buildCategoryMetadata, CategoryPageContent } from "@/components/directory/category-page-content";

// Only /zh and /ms live here — English is the bare /directory/category/
// [categorySlug] URL (see the sibling page.tsx), so an explicit /en would
// just be a second URL for the same page; this route 404s that too rather
// than silently rendering it, keeping exactly one canonical URL per
// language.
function resolveLocale(locale: string) {
  return isDirectoryLocale(locale) && locale !== "en" ? locale : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; locale: string }>;
}): Promise<Metadata> {
  const { categorySlug, locale } = await params;
  const resolved = resolveLocale(locale);
  if (!resolved) return {};
  return buildCategoryMetadata(categorySlug, resolved);
}

// Same reasoning as the English variant's own dynamic export.
export const dynamic = "force-dynamic";

export default async function DirectoryCategoryLocalePage({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string; locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ categorySlug, locale }, { q }] = await Promise.all([params, searchParams]);
  const resolved = resolveLocale(locale);
  if (!resolved) notFound();
  return <CategoryPageContent categorySlug={categorySlug} locale={resolved} q={q ?? ""} />;
}

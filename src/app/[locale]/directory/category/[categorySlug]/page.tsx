import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveDirectoryLocale } from "@/lib/directory-locale";
import { buildCategoryMetadata, CategoryPageContent } from "@/components/directory/category-page-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; categorySlug: string }>;
}): Promise<Metadata> {
  const { locale, categorySlug } = await params;
  const resolved = resolveDirectoryLocale(locale);
  if (!resolved) return {};
  return buildCategoryMetadata(categorySlug, resolved);
}

// Listings are approved by hand and change rarely, but a plain Prisma read
// carries no dynamic signal of its own — without this the page would get
// frozen into the build's static output the first time it renders, and
// every visitor after that would see whatever set of partners existed then.
export const dynamic = "force-dynamic";

export default async function DirectoryCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; categorySlug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ locale, categorySlug }, { q }] = await Promise.all([params, searchParams]);
  const resolved = resolveDirectoryLocale(locale);
  if (!resolved) notFound();
  return <CategoryPageContent categorySlug={categorySlug} locale={resolved} q={q ?? ""} />;
}

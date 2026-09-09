import type { Metadata } from "next";
import { buildCategoryMetadata, CategoryPageContent } from "@/components/directory/category-page-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
  const { categorySlug } = await params;
  return buildCategoryMetadata(categorySlug, "en");
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
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ categorySlug }, { q }] = await Promise.all([params, searchParams]);
  return <CategoryPageContent categorySlug={categorySlug} locale="en" q={q ?? ""} />;
}

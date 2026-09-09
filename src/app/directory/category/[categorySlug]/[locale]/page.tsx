import { permanentRedirect, notFound } from "next/navigation";
import { isDirectoryLocale } from "@/lib/directory-locale";
import { categoryPath } from "@/lib/directory-category-labels";

// Only /zh and /ms ever lived here (see the sibling redirect stub one
// level up, which covers what was the bare English URL) — same "en" 404
// this route always had, just carried over. Superseded by
// src/app/[locale]/directory/category/....
export default async function LegacyDirectoryCategoryLocaleRedirect({
  params,
}: {
  params: Promise<{ categorySlug: string; locale: string }>;
}) {
  const { categorySlug, locale } = await params;
  if (!isDirectoryLocale(locale) || locale === "en") notFound();
  permanentRedirect(categoryPath(categorySlug, locale));
}

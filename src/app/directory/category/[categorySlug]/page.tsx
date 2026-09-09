import { permanentRedirect } from "next/navigation";
import { categoryPath } from "@/lib/directory-category-labels";

// This bare URL was always strictly English (the old scheme's /zh and /ms
// variants lived one level deeper, at .../[categorySlug]/[locale] — see the
// sibling redirect stub there) — so unlike the other legacy redirects here,
// this one's target language isn't a guess, it's exactly what this URL
// always meant. Superseded by src/app/[locale]/directory/category/....
export default async function LegacyDirectoryCategoryRedirect({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;
  permanentRedirect(categoryPath(categorySlug, "en"));
}

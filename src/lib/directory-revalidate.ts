import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/slug";
import { categoryPath } from "@/lib/directory-category-labels";
import { DIRECTORY_LOCALES, directoryHomePath, directoryListingPath } from "@/lib/directory-i18n";

// The one place that knows which public directory paths a change touches.
// The actions in src/app/actions/directory.ts used to revalidate the
// pre-rename "/directory" and "/directory/<slug>" paths, which no page has
// lived at since the directory moved to /en|/zh|/ms/business — every call
// was a silent no-op. Harmless while all three directory pages are
// force-dynamic, but the moment any of them is cached (roadmap Phase 1)
// a stale home page or listing would have been the symptom.
//
// Every language of a page changes together (one published snapshot,
// three locales), so the home page is always included and each listing
// and category is revalidated in all three.
export function revalidateDirectory({ slugs = [], categories = [] }: { slugs?: string[]; categories?: string[] } = {}) {
  for (const { code } of DIRECTORY_LOCALES) {
    revalidatePath(directoryHomePath(code));
    for (const slug of slugs) revalidatePath(directoryListingPath(code, slug));
    for (const category of categories) revalidatePath(categoryPath(slugify(category), code));
  }
}

import { db } from "@/lib/db";
import { getSiteOrigin } from "@/lib/site-url";
import { slugify } from "@/lib/slug";
import { DIRECTORY_LOCALES, DIRECTORY_HOME_TITLE_BY_LOCALE, directoryHomePath } from "@/lib/directory-i18n";
import { translateCategoryName, categoryPath } from "@/lib/directory-category-labels";

// llms.txt (see llmstxt.org) — the GEO counterpart to robots.txt/
// sitemap.xml above: a plain-language index an AI system reads directly
// rather than crawling and inferring from HTML, so it can point a visitor
// at the right page (or cite it) without guessing at this app's routing.
// Only the same public business directory robots.ts already allows is
// listed — everything else in this app sits behind a login wall regardless
// of what this file says.
export const dynamic = "force-dynamic";

function describeLocale(locale: (typeof DIRECTORY_LOCALES)[number]["code"]): string {
  if (locale === "zh") return "Chinese (简体中文)";
  if (locale === "ms") return "Malay (Bahasa Melayu)";
  return "English";
}

export async function GET() {
  const siteOrigin = await getSiteOrigin();
  const categories = await db.businessCategory.findMany({ orderBy: { name: "asc" }, select: { name: true } });

  const lines: string[] = [];
  lines.push(`# ${DIRECTORY_HOME_TITLE_BY_LOCALE.en}`);
  lines.push("");
  lines.push(
    "> A directory of trusted businesses in the Gotka network, searchable by name, service, industry, or category. Each business's own page lists what it offers, its hours, its location, and a direct way to reach it. Published in three languages, each its own real URL rather than a machine translation layered on top.",
  );
  lines.push("");

  lines.push("## Directory home");
  for (const { code } of DIRECTORY_LOCALES) {
    lines.push(`- [${describeLocale(code)}](${siteOrigin}${directoryHomePath(code)}): ${DIRECTORY_HOME_TITLE_BY_LOCALE[code]}.`);
  }
  lines.push("");

  if (categories.length > 0) {
    lines.push("## Categories");
    for (const { name } of categories) {
      const slug = slugify(name);
      lines.push(`- [${translateCategoryName(name, "en")}](${siteOrigin}${categoryPath(slug, "en")})`);
    }
    lines.push("");
  }

  lines.push("## Full index");
  lines.push(
    `- [sitemap.xml](${siteOrigin}/sitemap.xml): Every published business's page, in all three languages.`,
  );

  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

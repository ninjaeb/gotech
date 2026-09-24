import Link from "next/link";
import { headers } from "next/headers";
import { DIRECTORY_LOCALE_HEADER } from "@/lib/directory-locale-header";
import { DIRECTORY_STRINGS, directoryHomePath } from "@/lib/directory-i18n";
import { buttonClasses } from "@/components/ui/button";

// What a visitor (or a crawler following a stale link) sees for a slug or
// category that doesn't exist: the directory's own chrome and language,
// with a way back in, instead of the app-wide bare "Gotka CRM" error shell
// this segment fell through to before. Next still answers 404 with a
// noindex meta, so nothing here gets indexed.
//
// A not-found boundary gets no route params, so the language comes from
// the header src/proxy.ts sets from the URL's locale segment — the same
// source the root layout uses for <html lang>.
export default async function DirectoryNotFound() {
  const header = (await headers()).get(DIRECTORY_LOCALE_HEADER);
  const locale = header === "zh" || header === "ms" ? header : "en";
  const t = DIRECTORY_STRINGS[locale];

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-16 text-center sm:px-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t.notFoundTitle}</h1>
      <p className="text-base text-slate-600 dark:text-slate-300">{t.notFoundDescription}</p>
      <Link
        href={directoryHomePath(locale)}
        className={buttonClasses("primary", "md", "bg-led text-led-ink hover:bg-led-hover active:bg-led-active focus-visible:ring-led")}
      >
        {t.notFoundBackCta}
      </Link>
    </div>
  );
}

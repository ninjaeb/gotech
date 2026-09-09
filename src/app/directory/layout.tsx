import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DirectoryLanguageSwitcher } from "@/components/directory/directory-language-switcher";
import { getDirectoryLocale } from "@/lib/directory-locale";
import { DIRECTORY_STRINGS } from "@/lib/directory-i18n";

// The one page in this app deliberately styled like gotka.com's own
// marketing site (header/hero/footer) rather than the minimal centered-card
// wrapper every other public page (/lead, /book, /subscribe) uses — those
// are single-purpose forms, this is a browsable directory meant to feel
// like a page on the company's own site.
export default async function DirectoryLayout({ children }: { children: React.ReactNode }) {
  const locale = await getDirectoryLocale();
  const t = DIRECTORY_STRINGS[locale];

  return (
    <div className="flex min-h-full flex-col bg-slate-50 dark:bg-neutral-950">
      <header className="border-b border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-8">
          <Link href="/directory" className="flex shrink-0 items-center gap-2">
            <img src="/icon-192.png" alt="" className="h-8 w-8 shrink-0" />
            <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">Gotka</span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <DirectoryLanguageSwitcher current={locale} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white py-8 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="w-full px-4 text-center text-sm text-slate-500 dark:text-slate-400 sm:px-8">
          <p>{t.footerTagline}</p>
          <p className="mt-1">
            <a
              href="https://gotka.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-petrol hover:underline dark:text-petrol-light"
            >
              gotka.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

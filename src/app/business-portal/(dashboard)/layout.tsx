import Link from "next/link";
import { requirePartner } from "@/lib/auth/dal";
import { businessLogout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DirectoryLanguageSwitcher } from "@/components/directory/directory-language-switcher";
import { getDirectoryLocale } from "@/lib/directory-locale";
import { PartnerNavMenu } from "@/components/referrals/partner-nav";
import { PartnerSidebar } from "@/components/referrals/partner-sidebar";

// The business portal's own shell — deliberately not the CRM's (dashboard)
// layout's dark sidebar or global search, but same Sidebar/MobileNav split
// as that layout (see src/components/layout/sidebar.tsx + mobile-nav.tsx):
// PartnerSidebar is a persistent rail from `sm` up, PartnerNavMenu's
// hamburger takes over below it, in its own header here matching the
// public directory's own header (src/components/directory/
// directory-chrome.tsx) — sticky, same icon+wordmark treatment, same
// language switcher + theme toggle + hamburger row — since a business
// owner moves between the two and the chrome should feel continuous there.
export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const [, locale] = await Promise.all([requirePartner(), getDirectoryLocale()]);

  return (
    <div className="flex h-full min-h-full">
      <PartnerSidebar signOutAction={businessLogout} locale={locale} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 sm:hidden">
          <div className="flex w-full items-center gap-3 px-4 py-3">
            <Link href="/business-portal" className="flex shrink-0 items-center gap-2">
              <img src="/icon-192.png" alt="" className="h-8 w-8 shrink-0" />
              <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">Business Portal</span>
            </Link>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <DirectoryLanguageSwitcher current={locale} />
              <ThemeToggle />
              <PartnerNavMenu signOutAction={businessLogout} locale={locale} />
            </div>
          </div>
        </header>
        <div className="hidden items-center justify-end gap-1 border-b border-slate-200 bg-white px-8 py-2.5 dark:border-neutral-800 dark:bg-neutral-900 sm:flex">
          <DirectoryLanguageSwitcher current={locale} />
          <ThemeToggle />
        </div>
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}

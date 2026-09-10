import Link from "next/link";
import { requirePartner } from "@/lib/auth/dal";
import { businessLogout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DirectoryLanguageSwitcher } from "@/components/directory/directory-language-switcher";
import { getDirectoryLocale } from "@/lib/directory-locale";
import { PartnerNavMenu } from "@/components/referrals/partner-nav";

// The business portal's own shell — deliberately not the CRM's (dashboard)
// layout: a partner is an external referrer, so no sidebar, no global
// search, no notifications, none of the CRM's nav. Styled to match the
// public directory's own header (src/components/directory/directory-chrome.tsx)
// exactly — sticky, same icon+wordmark treatment, same language switcher +
// theme toggle + hamburger row — since a business owner moves between the
// two and the chrome should feel continuous. PartnerNavMenu is always a
// hamburger here (no inline tab row on wide screens), grouping every portal
// page under "My Business" alongside a link out to the public directory.
export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const [, locale] = await Promise.all([requirePartner(), getDirectoryLocale()]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-8">
          <Link href="/business-portal" className="flex shrink-0 items-center gap-2">
            <img src="/icon-192.png" alt="" className="h-8 w-8 shrink-0" />
            <span className="hidden text-lg font-semibold text-slate-900 dark:text-slate-100 sm:inline">
              Business Portal
            </span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <DirectoryLanguageSwitcher current={locale} />
            <ThemeToggle />
            <PartnerNavMenu signOutAction={businessLogout} locale={locale} />
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}

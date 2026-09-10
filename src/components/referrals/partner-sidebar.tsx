"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { BUSINESS_NAV_ITEMS, PARTNERSHIP_NAV_ITEMS } from "@/lib/business-nav-items";
import { directoryHomePath, type DirectoryLocale } from "@/lib/directory-i18n";

function isActive(pathname: string, href: string): boolean {
  return href === "/business-portal" ? pathname === "/business-portal" : pathname.startsWith(href);
}

const itemClasses = "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors";
const inactiveItemClasses =
  "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-neutral-800 dark:hover:text-slate-100";
const activeItemClasses = "bg-petrol/10 text-petrol dark:bg-petrol/20 dark:text-petrol-light";

// Desktop counterpart to PartnerNavMenu (src/components/referrals/
// partner-nav.tsx), same relationship as the CRM's own Sidebar/MobileNav
// split (src/components/layout/sidebar.tsx + mobile-nav.tsx) — a partner on
// a narrow screen still gets that hamburger dropdown (there's no room for a
// 240px rail there), but anyone with the width to spare gets it as a
// persistent rail instead of a menu they have to reopen on every page.
// Light/white rather than the CRM sidebar's dark navy, matching the rest of
// this portal's own gotka.com-branded chrome (see partner-layout.tsx's own
// comment) rather than reading as an internal admin tool.
export function PartnerSidebar({
  signOutAction,
  locale,
}: {
  signOutAction: () => void | Promise<void>;
  locale: DirectoryLocale;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 sm:flex">
      <Link
        href="/business-portal"
        className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 px-5 dark:border-neutral-800"
      >
        <img src="/icon-192.png" alt="" className="h-7 w-7 shrink-0" />
        <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">Business Portal</span>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <Link href={directoryHomePath(locale)} className={cn(itemClasses, inactiveItemClasses)}>
          Business Directory
        </Link>

        <div className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          My Business
        </div>
        {BUSINESS_NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(itemClasses, isActive(pathname, item.href) ? activeItemClasses : inactiveItemClasses)}
          >
            {item.label}
          </Link>
        ))}

        <div className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Partnership
        </div>
        {PARTNERSHIP_NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(itemClasses, isActive(pathname, item.href) ? activeItemClasses : inactiveItemClasses)}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <form action={signOutAction} className="border-t border-slate-200 p-3 dark:border-neutral-800">
        <button type="submit" className={cn(itemClasses, "w-full", inactiveItemClasses)}>
          <LogOut className="h-4 w-4 shrink-0 text-slate-400" />
          Sign out
        </button>
      </form>
    </aside>
  );
}

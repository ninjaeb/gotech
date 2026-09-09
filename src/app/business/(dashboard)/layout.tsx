import Link from "next/link";
import { LogOut } from "lucide-react";
import { requirePartner } from "@/lib/auth/dal";
import { businessLogout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PartnerNav, PartnerNavMenu } from "@/components/referrals/partner-nav";

// The business portal's own shell — deliberately not the CRM's (dashboard)
// layout: a partner is an external referrer, so no sidebar, no global
// search, no notifications, none of the CRM's nav. Styled to match the
// public directory's own header (src/app/directory/layout.tsx) — sticky,
// same icon+wordmark treatment — since a business owner moves between the
// two. Unlike the directory's header, whose menu is a small set of account
// actions always tucked behind a hamburger, this one is real page
// navigation: PartnerNav shows it inline once there's room, and
// PartnerNavMenu takes over with a hamburger below that breakpoint.
export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePartner();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-8">
          <Link href="/business" className="flex shrink-0 items-center gap-2">
            <img src="/icon-192.png" alt="" className="h-8 w-8 shrink-0" />
            <span className="hidden text-lg font-semibold text-slate-900 dark:text-slate-100 sm:inline">
              Business Portal
            </span>
          </Link>
          <PartnerNav />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden truncate text-sm text-slate-500 dark:text-slate-400 md:inline">{user.name}</span>
            <ThemeToggle />
            <form action={businessLogout} className="hidden sm:block">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-neutral-800 dark:hover:text-slate-200"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
            <PartnerNavMenu signOutAction={businessLogout} />
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}

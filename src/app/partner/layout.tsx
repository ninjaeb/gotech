import { LogOut } from "lucide-react";
import { requirePartner } from "@/lib/auth/dal";
import { logout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PartnerNav } from "@/components/referrals/partner-nav";

// The partner portal's own shell — deliberately not the CRM's (app) layout:
// a partner is an external referrer, so no sidebar, no global search, no
// notifications, none of the CRM's nav. Same minimal header approach as
// the client portal (src/app/portal).
export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePartner();

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-8">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
            G
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">GoTech partner portal</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.name}</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-neutral-800 dark:hover:text-slate-200"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-8">
          <PartnerNav />
        </div>
      </header>
      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}

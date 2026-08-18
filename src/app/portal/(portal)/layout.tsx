import { LogOut } from "lucide-react";
import { getCurrentClientUser } from "@/lib/portal/dal";
import { portalLogout } from "@/app/actions/portal-auth";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const clientUser = await getCurrentClientUser();

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 sm:px-8">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
          G
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            GoTech CRM
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {clientUser.company.name} portal
          </p>
        </div>
        <form action={portalLogout} className="ml-auto shrink-0">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-neutral-800 dark:hover:text-slate-200"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </header>
      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto w-full max-w-4xl">{children}</div>
      </main>
    </div>
  );
}

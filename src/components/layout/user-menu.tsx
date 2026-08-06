import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function UserMenu({
  user,
}: {
  user: { name: string; email: string; title: string | null };
}) {
  return (
    <div className="flex items-center gap-2.5 border-t border-slate-800 px-3 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
        {initials(user.name) || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-100">{user.name}</p>
        {user.title && <p className="truncate text-xs text-slate-500">{user.title}</p>}
      </div>
      <form action={logout}>
        <button
          type="submit"
          aria-label="Log out"
          title="Log out"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

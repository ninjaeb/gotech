"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BUSINESS_NAV_ITEMS } from "@/lib/business-nav-items";

function isActive(pathname: string, href: string): boolean {
  return href === "/business" ? pathname === "/business" : pathname.startsWith(href);
}

// The business portal's own nav — always a hamburger (there's no inline
// row on wide screens the way this used to split), same click-outside +
// Escape + dropdown-panel pattern as DirectoryNavMenu (src/components/
// directory/directory-nav-menu.tsx), ShareButton, and NotificationBell.
// Grouped to match how a partner thinks about the two sites they can move
// between: a link out to the public directory, then every portal page
// nested under "My Business", then sign out.
export function PartnerNavMenu({ signOutAction }: { signOutAction: () => void | Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const itemClasses =
    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-neutral-800";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-neutral-800 dark:hover:text-slate-100"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          <Link href="/directory" role="menuitem" onClick={() => setOpen(false)} className={itemClasses}>
            Business Directory
          </Link>

          <div className="border-t border-slate-100 px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-neutral-800 dark:text-slate-500">
            My Business
          </div>
          {BUSINESS_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(itemClasses, "pl-5", isActive(pathname, item.href) && "text-petrol dark:text-petrol-light")}
            >
              {item.label}
            </Link>
          ))}

          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className={cn(itemClasses, "border-t border-slate-100 dark:border-neutral-800")}
            >
              <LogOut className="h-4 w-4 shrink-0 text-slate-400" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

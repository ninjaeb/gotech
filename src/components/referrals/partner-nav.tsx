"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/business", label: "Overview" },
  { href: "/business/listing", label: "My listing" },
  { href: "/business/leads", label: "Leads" },
  { href: "/business/directory-leads", label: "Directory leads" },
  { href: "/business/commissions", label: "Commissions" },
  { href: "/business/profile", label: "Profile" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/business" ? pathname === "/business" : pathname.startsWith(href);
}

// The business portal's own page nav, shown inline in the sticky header on
// wider screens — PartnerNavMenu takes over at the same breakpoint this
// hides at, collapsing the same items (plus Sign out) into a hamburger.
export function PartnerNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            isActive(pathname, item.href)
              ? "bg-led-soft text-petrol-ink dark:bg-led-soft-dark dark:text-petrol-light"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-neutral-800 dark:hover:text-slate-200",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// The same nav items plus Sign out, tucked behind one hamburger button for
// screens too narrow for PartnerNav's inline row. Same click-outside +
// Escape + dropdown-panel pattern as DirectoryNavMenu (src/components/
// directory/directory-nav-menu.tsx), ShareButton, and NotificationBell.
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
    <div ref={containerRef} className="relative sm:hidden">
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
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(itemClasses, isActive(pathname, item.href) && "text-petrol dark:text-petrol-light")}
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

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogIn, Menu, Store, X } from "lucide-react";

// The directory header's only two real destinations beyond browsing —
// sign in to an existing account, or start listing a new one — tucked
// behind one hamburger button rather than sitting inline next to the
// language switcher/theme toggle. Same click-outside + Escape pattern as
// NotificationBell/ShareButton elsewhere in this app.
export function DirectoryNavMenu({
  loginLabel,
  listBusinessLabel,
}: {
  loginLabel: string;
  listBusinessLabel: string;
}) {
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
          <Link
            href="/system/login"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-neutral-800"
          >
            <LogIn className="h-4 w-4 shrink-0 text-slate-400" />
            {loginLabel}
          </Link>
          <Link
            href="/directory/signup"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-neutral-800"
          >
            <Store className="h-4 w-4 shrink-0 text-slate-400" />
            {listBusinessLabel}
          </Link>
        </div>
      )}
    </div>
  );
}

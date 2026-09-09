"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, LogIn, LogOut, Menu, Store, X } from "lucide-react";
import { BUSINESS_NAV_ITEMS } from "@/lib/business-nav-items";
import { cn } from "@/lib/utils";

// Who's currently browsing, as far as the hamburger menu cares — a signed-
// out visitor gets the sign-up funnel (Business Login, List your
// business); a signed-in business owner gets a shortcut back to their own
// portal instead of being asked to sign up again; a signed-in staff member
// gets a shortcut back to the CRM. Either signed-in case adds Sign out.
export type DirectoryViewer = "business" | "staff" | null;

// The directory header's real destinations — sign in, start listing a
// business, or (once signed in) jump back to your own portal — tucked
// behind one hamburger button rather than sitting inline next to the
// language switcher/theme toggle. Same click-outside + Escape pattern as
// NotificationBell/ShareButton elsewhere in this app.
export function DirectoryNavMenu({
  viewer,
  logoutAction,
  loginLabel,
  listBusinessLabel,
  directoryLabel,
  myBusinessLabel,
  goToCrmLabel,
  signOutLabel,
  directoryHref,
  signupHref,
}: {
  viewer: DirectoryViewer;
  logoutAction: () => void | Promise<void>;
  loginLabel: string;
  listBusinessLabel: string;
  directoryLabel: string;
  myBusinessLabel: string;
  goToCrmLabel: string;
  signOutLabel: string;
  // Locale-aware (see directory-chrome.tsx) — never a bare "/directory" or
  // "/directory/signup" here, so a click from within the locale-prefixed
  // tree stays in that same language instead of round-tripping through the
  // old bare URL's redirect.
  directoryHref: string;
  signupHref: string;
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
          {viewer === null && (
            <>
              {/* Same directoryLabel/Store combination the signed-in
              business viewer's own "back to directory" link uses below —
              this is the state that link was missing from: a visitor
              browsing an outside-the-shell page like /directory/signup or
              /business/login had no way back into the directory itself. */}
              <Link href={directoryHref} role="menuitem" onClick={() => setOpen(false)} className={itemClasses}>
                <Store className="h-4 w-4 shrink-0 text-slate-400" />
                {directoryLabel}
              </Link>
              <Link href="/business/login" role="menuitem" onClick={() => setOpen(false)} className={itemClasses}>
                <LogIn className="h-4 w-4 shrink-0 text-slate-400" />
                {loginLabel}
              </Link>
              <Link href={signupHref} role="menuitem" onClick={() => setOpen(false)} className={itemClasses}>
                <Store className="h-4 w-4 shrink-0 text-slate-400" />
                {listBusinessLabel}
              </Link>
            </>
          )}
          {viewer === "business" && (
            <>
              <Link href={directoryHref} role="menuitem" onClick={() => setOpen(false)} className={itemClasses}>
                <Store className="h-4 w-4 shrink-0 text-slate-400" />
                {directoryLabel}
              </Link>
              <div className="border-t border-slate-100 px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-neutral-800 dark:text-slate-500">
                {myBusinessLabel}
              </div>
              {BUSINESS_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={cn(itemClasses, "pl-5")}
                >
                  {item.label}
                </Link>
              ))}
            </>
          )}
          {viewer === "staff" && (
            // /system directly — the business portal now has its own
            // business_session cookie, entirely separate from the staff
            // session this viewer state implies (see directory-chrome.tsx),
            // so routing a staff member through /business first would just
            // bounce them to /business/login instead of anywhere useful.
            <Link href="/system" role="menuitem" onClick={() => setOpen(false)} className={itemClasses}>
              <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-400" />
              {goToCrmLabel}
            </Link>
          )}
          {viewer !== null && (
            <form action={logoutAction}>
              <button type="submit" role="menuitem" className={itemClasses}>
                <LogOut className="h-4 w-4 shrink-0 text-slate-400" />
                {signOutLabel}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { setDirectoryLocale } from "@/app/actions/directory";
import { DIRECTORY_LOCALES, type DirectoryLocale } from "@/lib/directory-i18n";
import { cn } from "@/lib/utils";

const LOCALE_CODES: readonly string[] = DIRECTORY_LOCALES.map((option) => option.code);

// Swaps the leading /en|/zh|/ms segment of the current URL for the chosen
// locale, preserving everything after it (path and query string) — a real
// <a href> per language rather than a client-side cookie flip, so every
// language variant of whatever page you're on is its own crawlable,
// bookmarkable URL (see directoryHomePath and friends in
// src/lib/directory-i18n.ts). setDirectoryLocale still runs alongside the
// navigation, keeping the cookie current for the one case that has no URL
// segment to read it from: a fresh visit to the bare "/" or an old,
// un-prefixed bookmark (see src/proxy.ts and src/app/directory/page.tsx).
//
// Pages outside the locale-prefixed tree — currently just /business/login,
// which still renders this same header (see directory-chrome.tsx) — have
// no segment to swap, so there this falls back to the old behavior: a
// plain button that just sets the cookie and re-renders in place.
export function DirectoryLanguageSwitcher({ current }: { current: DirectoryLocale }) {
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const segments = pathname.split("/");
  const withinLocaleTree = LOCALE_CODES.includes(segments[1] ?? "");
  const query = searchParams.toString();

  function pathFor(code: DirectoryLocale): string {
    const next = [...segments];
    next[1] = code;
    return next.join("/") + (query ? `?${query}` : "");
  }

  return (
    <div className="flex gap-1">
      {DIRECTORY_LOCALES.map((option) => {
        const active = current === option.code;
        const className = cn(
          "rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50",
          active
            ? "bg-petrol text-white dark:bg-petrol-light dark:text-petrol-ink"
            : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-neutral-800",
        );

        if (withinLocaleTree) {
          return (
            <Link
              key={option.code}
              href={pathFor(option.code)}
              aria-pressed={active}
              onClick={() => startTransition(() => setDirectoryLocale(option.code))}
              className={className}
            >
              {option.label}
            </Link>
          );
        }

        return (
          <button
            key={option.code}
            type="button"
            disabled={pending}
            aria-pressed={active}
            onClick={() => startTransition(() => setDirectoryLocale(option.code))}
            className={className}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

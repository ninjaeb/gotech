"use client";

import { useTransition } from "react";
import { setDirectoryLocale } from "@/app/actions/directory";
import { DIRECTORY_LOCALES, type DirectoryLocale } from "@/lib/directory-i18n";
import { cn } from "@/lib/utils";

// Calls the Server Action directly from onClick (wrapped in startTransition)
// rather than a <form> submission — see setDirectoryLocale's own comment:
// the cookie it sets re-renders the current route in the same round trip,
// so every string on the page updates without a full navigation.
export function DirectoryLanguageSwitcher({ current }: { current: DirectoryLocale }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-1">
      {DIRECTORY_LOCALES.map((option) => (
        <button
          key={option.code}
          type="button"
          disabled={pending}
          aria-pressed={current === option.code}
          onClick={() => startTransition(() => setDirectoryLocale(option.code))}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50",
            current === option.code
              ? "bg-petrol text-white dark:bg-petrol-light dark:text-petrol-ink"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-neutral-800",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

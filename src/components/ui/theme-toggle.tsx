"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

function toggleTheme() {
  const next = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", next);
  localStorage.setItem("theme", next ? "dark" : "light");
}

export function ThemeToggle({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title="Toggle theme"
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100",
        className,
      )}
    >
      <Moon className="hidden h-4 w-4 dark:block" />
      <Sun className="block h-4 w-4 dark:hidden" />
    </button>
  );
}

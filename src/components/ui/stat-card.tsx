import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "indigo",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: "indigo" | "emerald" | "amber" | "sky";
}) {
  const accents: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-md", accents[accent])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {value}
        </p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/business", label: "Overview" },
  { href: "/business/listing", label: "My listing" },
  { href: "/business/leads", label: "Leads" },
  { href: "/business/directory-leads", label: "Directory leads" },
  { href: "/business/commissions", label: "Commissions" },
  { href: "/business/profile", label: "Profile" },
];

export function PartnerNav() {
  const pathname = usePathname();
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto">
      {ITEMS.map((item) => {
        const active = item.href === "/business" ? pathname === "/business" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-petrol text-petrol dark:border-petrol-light dark:text-petrol-light"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

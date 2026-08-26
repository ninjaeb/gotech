"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { INDUSTRY_LABELS } from "@/lib/labels";
import type { Industry } from "@/generated/prisma/client";

type CompanyRow = {
  id: string;
  name: string;
  industry: Industry | null;
  domain: string | null;
  _count: { contacts: number; deals: number };
};

export function CompanySearchList({ companies }: { companies: CompanyRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (company) =>
        company.name.toLowerCase().includes(q) ||
        (company.industry && INDUSTRY_LABELS[company.industry].toLowerCase().includes(q)) ||
        company.domain?.toLowerCase().includes(q),
    );
  }, [companies, query]);

  return (
    <div>
      <div className="mb-4 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search companies…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={query ? "No companies match your search" : "No companies yet"}
          description={
            query ? "Try a different search term." : "Add your first company to start tracking contacts and deals."
          }
          action={
            !query && (
              <Link href="/companies/new" className={buttonClasses()}>
                <Plus className="h-4 w-4" />
                New company
              </Link>
            )
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
            {filtered.map((company) => (
              <li key={company.id}>
                <Link
                  href={`/companies/${company.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-neutral-800/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {company.name}
                    </p>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                      {[company.industry ? INDUSTRY_LABELS[company.industry] : null, company.domain]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span>{company._count.contacts} contacts</span>
                    <span>{company._count.deals} deals</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

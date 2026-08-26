"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckSquare, FolderKanban, KanbanSquare, Search, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { globalSearch, type SearchResultItem, type SearchResults } from "@/app/actions/search";

const EMPTY_RESULTS: SearchResults = { companies: [], contacts: [], deals: [], tasks: [], projects: [] };

const GROUPS: { key: keyof SearchResults; label: string; icon: LucideIcon; href: (id: string) => string }[] = [
  { key: "companies", label: "Companies", icon: Building2, href: (id) => `/companies/${id}` },
  { key: "contacts", label: "Contacts", icon: Users, href: (id) => `/contacts/${id}` },
  { key: "deals", label: "Deals", icon: KanbanSquare, href: (id) => `/deals/${id}` },
  { key: "projects", label: "Projects", icon: FolderKanban, href: (id) => `/projects/${id}` },
  { key: "tasks", label: "Tasks", icon: CheckSquare, href: (id) => `/tasks/${id}/edit` },
];

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const trimmed = query.trim();
    const timeout = setTimeout(() => {
      if (trimmed.length < 2) {
        setResults(EMPTY_RESULTS);
        return;
      }
      startTransition(async () => {
        const data = await globalSearch(trimmed);
        setResults(data);
      });
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length >= 2;
  const flatResults = GROUPS.flatMap((group) => results[group.key].map((item) => ({ item, group })));

  function go(href: string) {
    setOpen(false);
    setQuery("");
    setResults(EMPTY_RESULTS);
    router.push(href);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && flatResults.length > 0) {
            event.preventDefault();
            go(GROUPS.find((g) => g.key === flatResults[0].group.key)!.href(flatResults[0].item.id));
          }
        }}
        placeholder="Search companies, contacts, deals, tasks, projects…"
        aria-label="Global search"
        className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-100"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setResults(EMPTY_RESULTS);
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {open && hasQuery && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {flatResults.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">
              {pending ? "Searching…" : `No results for "${trimmedQuery}"`}
            </p>
          ) : (
            GROUPS.map((group) => {
              const items = results[group.key];
              if (items.length === 0) return null;
              const Icon = group.icon;
              return (
                <div key={group.key} className="border-b border-slate-100 py-1.5 last:border-0 dark:border-neutral-800">
                  <p className="px-4 pb-1 pt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                    {group.label}
                  </p>
                  {items.map((item: SearchResultItem) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go(group.href(item.id))}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-neutral-800"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.sublabel && (
                        <span className="shrink-0 truncate text-xs text-slate-400">{item.sublabel}</span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

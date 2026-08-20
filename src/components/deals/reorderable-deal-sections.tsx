"use client";

import { useSyncExternalStore } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  getDealSectionOrderSnapshot,
  getDefaultDealSectionOrder,
  saveDealSectionOrder,
  subscribeDealSectionOrder,
  type DealSectionKey,
} from "@/lib/deal-sections";

export function ReorderableDealSections({
  sections,
}: {
  sections: Record<DealSectionKey, React.ReactNode>;
}) {
  const order = useSyncExternalStore(
    subscribeDealSectionOrder,
    getDealSectionOrderSnapshot,
    getDefaultDealSectionOrder,
  );

  function move(key: DealSectionKey, direction: -1 | 1) {
    const index = order.indexOf(key);
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    saveDealSectionOrder(next);
  }

  return (
    <div className="space-y-6">
      {order.map((key, index) => (
        <div key={key} className="flex items-start gap-1.5">
          <div className="mt-4 flex shrink-0 flex-col gap-0.5">
            <button
              type="button"
              onClick={() => move(key, -1)}
              disabled={index === 0}
              aria-label="Move section up"
              title="Move section up"
              className="rounded p-0.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:pointer-events-none disabled:opacity-0 dark:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-slate-300"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => move(key, 1)}
              disabled={index === order.length - 1}
              aria-label="Move section down"
              title="Move section down"
              className="rounded p-0.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:pointer-events-none disabled:opacity-0 dark:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-slate-300"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <div className="min-w-0 flex-1">{sections[key]}</div>
        </div>
      ))}
    </div>
  );
}

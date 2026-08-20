"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import {
  getDealSectionOrderSnapshot,
  getDefaultDealSectionOrder,
  saveDealSectionOrder,
  subscribeDealSectionOrder,
  type DealSectionKey,
} from "@/lib/deal-sections";
import { cn } from "@/lib/utils";

export function ReorderableDealSections({
  sections,
}: {
  sections: Record<DealSectionKey, React.ReactNode>;
}) {
  const storedOrder = useSyncExternalStore(
    subscribeDealSectionOrder,
    getDealSectionOrderSnapshot,
    getDefaultDealSectionOrder,
  );

  // Local copy so a drag-in-progress can move sections around freely without
  // writing to localStorage on every pixel of pointer movement — only
  // committed on drop. Resynced from the store whenever it changes for a
  // reason other than this component's own drag (the post-hydration
  // correction useSyncExternalStore does once on mount). Setting state
  // directly in the render body like this — rather than in an effect — is
  // React's documented way to derive state from a changed external value.
  const [order, setOrder] = useState(storedOrder);
  const [lastStoredOrder, setLastStoredOrder] = useState(storedOrder);
  if (storedOrder !== lastStoredOrder) {
    setLastStoredOrder(storedOrder);
    setOrder(storedOrder);
  }

  const rowRefs = useRef<Partial<Record<DealSectionKey, HTMLDivElement | null>>>({});
  const [dragKey, setDragKey] = useState<DealSectionKey | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragStartYRef = useRef(0);

  function move(key: DealSectionKey, direction: -1 | 1) {
    const index = order.indexOf(key);
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    saveDealSectionOrder(next);
  }

  function computeDropIndex(pointerY: number, excludeKey: DealSectionKey): number {
    const siblings = order.filter((key) => key !== excludeKey);
    for (let i = 0; i < siblings.length; i++) {
      const el = rowRefs.current[siblings[i]];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (pointerY < rect.top + rect.height / 2) return i;
    }
    return siblings.length;
  }

  function startDrag(event: React.PointerEvent, key: DealSectionKey) {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragStartYRef.current = event.clientY;
    setDragKey(key);
    setDragOffsetY(0);
    setDropIndex(order.indexOf(key));
  }

  function handleDragMove(event: React.PointerEvent, key: DealSectionKey) {
    if (dragKey !== key) return;
    setDragOffsetY(event.clientY - dragStartYRef.current);
    setDropIndex(computeDropIndex(event.clientY, key));
  }

  function endDrag(key: DealSectionKey) {
    if (dragKey !== key) return;
    if (dropIndex !== null) {
      const siblings = order.filter((k) => k !== key);
      const next = [...siblings];
      next.splice(dropIndex, 0, key);
      setOrder(next);
      saveDealSectionOrder(next);
    }
    setDragKey(null);
    setDropIndex(null);
  }

  return (
    <div className="space-y-6">
      {order.map((key, index) => {
        const isDragging = dragKey === key;
        // While dragging, show the insertion point as a highlighted top
        // border on whichever row it would land before (or the last row's
        // bottom edge, for "move to the end").
        const siblingIndexIfDragging = dragKey ? order.filter((k) => k !== dragKey).indexOf(key) : -1;
        const showDropBefore = dragKey && dragKey !== key && dropIndex === siblingIndexIfDragging;
        const isLastSibling = dragKey && dragKey !== key && key === order.filter((k) => k !== dragKey).at(-1);
        const showDropAfter = isLastSibling && dropIndex === order.length - 1;

        return (
          <div
            key={key}
            ref={(el) => {
              rowRefs.current[key] = el;
            }}
            className={cn(
              "flex items-start gap-1.5 border-t-2 border-b-2 border-t-transparent border-b-transparent transition-shadow",
              showDropBefore && "border-t-indigo-500",
              showDropAfter && "border-b-indigo-500",
              isDragging && "relative z-10 opacity-90 shadow-lg",
            )}
            style={isDragging ? { transform: `translateY(${dragOffsetY}px)` } : undefined}
          >
            <div className="mt-4 flex shrink-0 flex-col items-center gap-0.5">
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
                onPointerDown={(event) => startDrag(event, key)}
                onPointerMove={(event) => handleDragMove(event, key)}
                onPointerUp={() => endDrag(key)}
                onPointerCancel={() => endDrag(key)}
                aria-label="Drag to reorder"
                title="Drag to reorder"
                className="touch-none rounded p-0.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-slate-300"
              >
                <GripVertical className="h-4 w-4 cursor-grab" />
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
        );
      })}
    </div>
  );
}

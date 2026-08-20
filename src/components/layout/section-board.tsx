"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { updateSectionLayout } from "@/app/actions/section-layout";
import type { PageType, SectionLayout, SectionZone } from "@/lib/section-layout";
import { cn } from "@/lib/utils";

// Generic drag-and-drop reordering for a page's Card sections, across two
// columns (main/sidebar) — used by the Deal/Company/Contact detail pages.
// Built on pointer events rather than the native HTML5 DnD API (poor touch
// support) so it works with mouse and touch alike. Layout is persisted
// per-user via updateSectionLayout, not localStorage, so it follows the
// user across browsers/devices rather than staying per-browser.
export function SectionBoard({
  pageType,
  initialLayout,
  pinnedMain,
  sections,
}: {
  pageType: PageType;
  initialLayout: SectionLayout;
  pinnedMain?: React.ReactNode;
  sections: Record<string, React.ReactNode>;
}) {
  const [layout, setLayout] = useState(initialLayout);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const zoneRefs = useRef<Record<SectionZone, HTMLDivElement | null>>({ main: null, sidebar: null });

  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [dropZone, setDropZone] = useState<SectionZone | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragStartYRef = useRef(0);
  const lastZoneRef = useRef<SectionZone>("main");

  function move(key: string, zone: SectionZone, direction: -1 | 1) {
    const list = layout[zone];
    const index = list.indexOf(key);
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    const nextLayout = { ...layout, [zone]: next };
    setLayout(nextLayout);
    void updateSectionLayout(pageType, nextLayout);
  }

  // Which zone's container the pointer is currently over — a real 2D hit
  // test against both containers' rects, not just an X split, so this
  // still behaves when the columns stack vertically on narrow screens.
  function zoneAt(x: number, y: number): SectionZone {
    for (const zone of ["main", "sidebar"] as const) {
      const rect = zoneRefs.current[zone]?.getBoundingClientRect();
      if (rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return zone;
      }
    }
    return lastZoneRef.current;
  }

  function computeDropIndex(zone: SectionZone, pointerY: number, excludeKey: string): number {
    const siblings = layout[zone].filter((key) => key !== excludeKey);
    for (let i = 0; i < siblings.length; i++) {
      const el = rowRefs.current[siblings[i]];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (pointerY < rect.top + rect.height / 2) return i;
    }
    return siblings.length;
  }

  function startDrag(event: React.PointerEvent, key: string, zone: SectionZone) {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragStartYRef.current = event.clientY;
    lastZoneRef.current = zone;
    setDragKey(key);
    setDragOffsetY(0);
    setDropZone(zone);
    setDropIndex(layout[zone].indexOf(key));
  }

  function handleDragMove(event: React.PointerEvent, key: string) {
    if (dragKey !== key) return;
    setDragOffsetY(event.clientY - dragStartYRef.current);
    const zone = zoneAt(event.clientX, event.clientY);
    lastZoneRef.current = zone;
    setDropZone(zone);
    setDropIndex(computeDropIndex(zone, event.clientY, key));
  }

  function endDrag(key: string) {
    if (dragKey !== key) return;
    if (dropZone !== null && dropIndex !== null) {
      const sourceZone: SectionZone = layout.main.includes(key) ? "main" : "sidebar";
      const sourceRemaining = layout[sourceZone].filter((k) => k !== key);
      const nextLayout: SectionLayout = { ...layout, [sourceZone]: sourceRemaining };
      const targetList = sourceZone === dropZone ? sourceRemaining : [...nextLayout[dropZone]];
      targetList.splice(dropIndex, 0, key);
      nextLayout[dropZone] = targetList;
      setLayout(nextLayout);
      void updateSectionLayout(pageType, nextLayout);
    }
    setDragKey(null);
    setDropZone(null);
    setDropIndex(null);
  }

  function renderZone(zone: SectionZone) {
    const keys = layout[zone];
    const siblingsExcludingDrag = dragKey ? keys.filter((k) => k !== dragKey) : keys;

    return (
      <div
        ref={(el) => {
          zoneRefs.current[zone] = el;
        }}
        className="space-y-6"
      >
        {keys.map((key, index) => {
          if (!sections[key]) return null;
          const isDragging = dragKey === key;
          const posExcludingDrag = siblingsExcludingDrag.indexOf(key);
          const showDropBefore = dragKey && dragKey !== key && dropZone === zone && dropIndex === posExcludingDrag;
          const isLastSibling = dragKey && dragKey !== key && key === siblingsExcludingDrag.at(-1);
          const showDropAfter = isLastSibling && dropZone === zone && dropIndex === siblingsExcludingDrag.length;

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
                  onClick={() => move(key, zone, -1)}
                  disabled={index === 0}
                  aria-label="Move section up"
                  title="Move section up"
                  className="rounded p-0.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:pointer-events-none disabled:opacity-0 dark:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-slate-300"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onPointerDown={(event) => startDrag(event, key, zone)}
                  onPointerMove={(event) => handleDragMove(event, key)}
                  onPointerUp={() => endDrag(key)}
                  onPointerCancel={() => endDrag(key)}
                  aria-label="Drag to reorder"
                  title="Drag to reorder — can be moved to the sidebar too"
                  className="touch-none rounded p-0.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-slate-300"
                >
                  <GripVertical className="h-4 w-4 cursor-grab" />
                </button>
                <button
                  type="button"
                  onClick={() => move(key, zone, 1)}
                  disabled={index === keys.length - 1}
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

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {pinnedMain}
        {renderZone("main")}
      </div>
      {renderZone("sidebar")}
    </div>
  );
}

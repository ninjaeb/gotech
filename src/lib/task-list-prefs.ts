import { isSortKey, type SortKey } from "@/lib/task-filters";

// `assignee`/`minDealValue` are left `undefined` for "never saved, use the
// page's own default" and a real string (including "") for an explicit
// remembered choice — same undefined-vs-empty-string distinction the Tasks
// page's own URL params already rely on (see `assigneeExplicit` there), so
// a saved preference and a same-visit URL param can share one fallback.
export type TaskListPrefs = {
  sort: SortKey;
  assignee?: string;
  minDealValue?: string;
};

const DEFAULT_PREFS: TaskListPrefs = { sort: "due" };

// Tolerant parse — mirrors readSectionLayout's own reasoning (src/lib/
// section-layout.ts): a value from before this field existed, or one
// that's simply malformed, just falls back to the same default a
// brand-new user gets, never a render error.
export function readTaskListPrefs(json: string | null): TaskListPrefs {
  if (!json) return DEFAULT_PREFS;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return {
      sort: typeof parsed.sort === "string" && isSortKey(parsed.sort) ? parsed.sort : DEFAULT_PREFS.sort,
      assignee: typeof parsed.assignee === "string" ? parsed.assignee : undefined,
      minDealValue: typeof parsed.minDealValue === "string" ? parsed.minDealValue : undefined,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}
